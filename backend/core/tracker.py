import cv2
import os
import numpy as np
import faiss
import torch
import time
import threading
import sys
import json
from collections import deque
from insightface.app import FaceAnalysis
from bytetracker.byte_tracker import BYTETracker
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from datetime import datetime
import queue
from dataclasses import dataclass, field
from typing import List, Tuple, Dict, Optional
from db import db_utils
from concurrent.futures import ThreadPoolExecutor

# Constants
MAX_LIFETIME = 60
FRAME_INTERVAL = 1/10
GLOBAL_TRACK_TIMEOUT = 300
EMBEDDING_HISTORY_SIZE = 5
TRACK_BUFFER_SIZE = 30
@dataclass
class GlobalTrack:
    employee_id: str
    last_seen_time: float
    last_camera_id: int
    embedding_history: deque
    confidence_score: float = 0.0
    work_status: str = "working"
@dataclass
class FaceQualityMetrics:
    sharpness_score: float
    brightness_score: float
    angle_score: float
    size_score: float
    overall_quality: float
@dataclass
class TrackingState:
    position_history: List[Tuple[int, int]]
    velocity: Tuple[float, float]
    predicted_position: Tuple[int, int]
    confidence_history: List[float]
    quality_history: List[FaceQualityMetrics]
@dataclass
class TrackingData:
    """Holds all annotation data for a single frame."""
    identities: List[str] = field(default_factory=list)
    scores: List[float] = field(default_factory=list)
    bboxes: List[List[int]] = field(default_factory=list)
class MemoryPool:
    def __init__(self, max_size=1000):
        self.frame_pool = queue.Queue(maxsize=max_size)
        self.embedding_pool = queue.Queue(maxsize=max_size)
        self.bbox_pool = queue.Queue(maxsize=max_size)
    def get_frame_buffer(self, shape):
        try:
            buffer = self.frame_pool.get_nowait()
            if buffer.shape == shape:
                return buffer
        except queue.Empty:
            pass
        return np.empty(shape, dtype=np.uint8)
    def return_frame_buffer(self, buffer):
        try:
            self.frame_pool.put_nowait(buffer)
        except queue.Full:
            pass
    def get_embedding_buffer(self):
        try:
            return self.embedding_pool.get_nowait()
        except queue.Empty:
            return np.empty(512, dtype=np.float32)
    def return_embedding_buffer(self, buffer):
        try:
            self.embedding_pool.put_nowait(buffer)
        except queue.Full:
            pass
class KalmanTracker:
    def __init__(self, tuning_config):
        self.kalman = cv2.KalmanFilter(4, 2)
        self.kalman.measurementMatrix = np.array([[1, 0, 0, 0], [0, 1, 0, 0]], np.float32)
        self.kalman.transitionMatrix = np.array([[1, 0, 1, 0], [0, 1, 0, 1], [0, 0, 1, 0], [0, 0, 0, 1]], np.float32)
        self.kalman.processNoiseCov = tuning_config.get('kalman_process_noise', 0.1) * np.eye(4, dtype=np.float32)
        self.kalman.measurementNoiseCov = tuning_config.get('kalman_measurement_noise', 0.1) * np.eye(2, dtype=np.float32)
        self.kalman.errorCovPost = np.eye(4, dtype=np.float32)
        self.initialized = False
    def update(self, center_x: int, center_y: int) -> Tuple[int, int]:
        measurement = np.array([[np.float32(center_x)], [np.float32(center_y)]])
        if not self.initialized:
            self.kalman.statePre = np.array([center_x, center_y, 0, 0], dtype=np.float32).reshape(4, 1)
            self.kalman.statePost = np.array([center_x, center_y, 0, 0], dtype=np.float32).reshape(4, 1)
            self.initialized = True
        self.kalman.predict()
        self.kalman.correct(measurement)
        corrected = self.kalman.statePost
        return int(corrected[0, 0]), int(corrected[1, 0])
class APILogger:
    def __init__(self, api_config):
        self.config = api_config
        self.session = requests.Session()
        retry_strategy = Retry(
            total=api_config.get('max_retries', 3),
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504])
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)
        self.token_lock = threading.Lock()
        self.access_token = api_config.get('access_token', '')
        self.refresh_token = api_config.get('refresh_token', '')
        self.client_id = api_config.get('client_id', '')
        self.client_secret = api_config.get('client_secret', '')
        self.token_expiry = 0
        self._refresh_token()
    def _refresh_token(self):
        with self.token_lock:
            if time.time() < self.token_expiry - 300:
                return True
            print("[API] Attempting to refresh access token...")
            params = {
                'refresh_token': self.refresh_token,
                'client_id': self.client_id,
                'client_secret': self.client_secret,
                'grant_type': 'refresh_token'}
            try:
                response = requests.post(
                    self.config['token_url'],
                    params=params,
                    timeout=self.config.get('timeout', 10))
                response.raise_for_status()
                data = response.json()
                self.access_token = data['access_token']
                self.token_expiry = time.time() + data.get('expires_in', 3600)
                print(f"[API] Successfully refreshed access token. Expires in {data.get('expires_in', 3600)} seconds.")
                return True
            except requests.exceptions.RequestException as e:
                print(f"[API-ERROR] Token refresh failed. Details: {str(e)}")
                self.access_token = ""
                self.token_expiry = 0
                return False
    def log_attendance_async(self, emp_id: str, event_type: str):
        threading.Thread(
            target=self._send_attendance_to_api,
            args=(emp_id, event_type),
            daemon=True
        ).start()
    def _send_attendance_to_api(self, emp_id: str, event_type: str):
        if not self.access_token or time.time() >= self.token_expiry - 300:
            if not self._refresh_token():
                print(f"[API-WARN] Skipping attendance log for {emp_id} - no valid access token.")
                return False
        params = {
            'empId': emp_id,
            'dateFormat': 'dd-MM-yyyy HH:mm:ss'}
        current_time = datetime.now().strftime("%d-%m-%Y %H:%M:%S")
        if event_type == "check_in":
            params['checkIn'] = current_time
        else:
            params['checkOut'] = current_time
        url = self.config['base_url'] + self.config['attendance_endpoint']
        try:
            response = self.session.post(
                url,
                params=params,
                headers={'Authorization': f'Bearer {self.access_token}'},
                timeout=self.config.get('timeout', 10))
            if response.status_code == 200:
                print(f"[API-SUCCESS] Successfully logged {event_type} for employee {emp_id}.")
                return True
            else:
                print(f"[API-ERROR] Failed to log attendance for {emp_id}. Status: {response.status_code}, Response: {response.text}")
                return False
        except requests.exceptions.RequestException as e:
            print(f"[API-ERROR] Network request failed while logging attendance for {emp_id}. Details: {str(e)}")
            return False

class FaceTrackingSystem:
    def __init__(self, api_config):
        self.api_config = api_config
        self.api_logger = APILogger(self.api_config)
        self.memory_pool = MemoryPool()
        print("[SYSTEM] Loading configurations and face data from database...")

        self.camera_configs_list = db_utils.get_camera_configs()
        self.camera_configs: Dict[int, dict] = {cam['id']: cam for cam in self.camera_configs_list}

        self.tuning_settings = db_utils.get_system_settings()
        self.embeddings, self.labels = db_utils.get_all_face_embeddings()   

        if not self.camera_configs:
            print("[FATAL-ERROR] No active cameras found in the database. Please add cameras and try again.")
            sys.exit(1)
        if not self.tuning_settings:
            print("[FATAL-ERROR] System tuning settings not found in the database. Please run db_setup.py.")
            sys.exit(1)
        print(f"[SYSTEM] Successfully loaded {len(self.camera_configs)} camera(s) and {len(self.embeddings)} face embeddings.")

        self.index = None
        self.apps = {}
        self.trackers = {}
        self.global_tracks = {}
        self.frame_locks = {}
        self.latest_frames = {}
        self.latest_faces = {}
        self.embedding_cache = {}
        self.kalman_trackers = {}
        self.tracking_states = {}
        
        # --- MODIFIED: Per-camera thread and state management ---
        self.camera_threads: Dict[int, threading.Thread] = {}
        self.camera_shutdown_events: Dict[int, threading.Event] = {}
        self.camera_status: Dict[int, str] = {cam['id']: 'stopped' for cam in self.camera_configs_list}
        self.is_running = False # Overall service status
        self.tracker_lock = threading.Lock() # Lock for modifying tracker state
        self.global_shutdown_flag = threading.Event() # For full system shutdown

        self.identity_tracks = {}
        self.identity_last_seen = {}
        self.identity_cameras = {}
        self.identity_positions = {}
        self.identity_trip_logged = {}
        self.identity_crossing_state = {}
        self.identity_zone_state = {}
        self.next_global_track_id = 1
        self.last_faces_reload = time.time()
        self.faces_reload_interval = 30
        self.frame_skip_counter = {}
        self.detection_interval = {}
        self.last_embedding_update = {}
        self.embedding_update_queue = queue.Queue()
        self.embedding_update_worker = None
        self.track_identities = {}
        self.batch_update_threshold = 5
        self.updates_since_last_rebuild = 0
        self.max_updates_before_rebuild = self.tuning_settings.get('max_updates_before_rebuild', 20)
        self.latest_raw_frames: Dict[int, Optional[np.ndarray]] = {cam['id']: None for cam in self.camera_configs_list}
        self.raw_frame_locks: Dict[int, threading.Lock] = {cam['id']: threading.Lock() for cam in self.camera_configs_list}
        self.latest_tracking_data: Dict[int, TrackingData] = {cam['id']: TrackingData() for cam in self.camera_configs_list}
        self.tracking_data_locks: Dict[int, threading.Lock] = {cam['id']: threading.Lock() for cam in self.camera_configs_list}
        max_workers = min(len(self.camera_configs) * 2, 16)
        self.thread_pool = ThreadPoolExecutor(max_workers=max_workers, thread_name_prefix="FaceTracker")
        self.detection_pools = {gpu_id: ThreadPoolExecutor(max_workers=4, thread_name_prefix=f"Detection-GPU{gpu_id}") 
                            for gpu_id in set(cam['gpu_id'] for cam in self.camera_configs_list)}
        self.frame_queues = {cam['id']: queue.Queue(maxsize=5) for cam in self.camera_configs_list}
        self.result_queues = {cam['id']: queue.Queue(maxsize=10) for cam in self.camera_configs_list}
        self.embedding_update_queue = queue.PriorityQueue(maxsize=200)
        self.global_tracks_lock = threading.RLock()
        self.embedding_update_lock = threading.RLock()
        self.embedding_cache_lock = threading.RLock()
        self.faiss_index_lock = threading.RLock()
        self.latest_processed_frames: Dict[int, Optional[np.ndarray]] = {cam['id']: None for cam in self.camera_configs_list}
        self.processed_frame_locks: Dict[int, threading.Lock] = {cam['id']: threading.Lock() for cam in self.camera_configs_list}
        self._initialize_faiss()
        self._initialize_multi_gpu_insightface()
        self._initialize_cameras()
        self.embedding_update_worker = threading.Thread(target=self._embedding_update_worker, daemon=True)
        self.embedding_update_worker.start()
        self.frame_processors = []
        for cam_config in self.camera_configs_list:
            processor = threading.Thread(target=self._frame_processor_thread, args=(cam_config,), daemon=True)
            processor.start()
            self.frame_processors.append(processor)

    # --- NEW: Granular and Global Tracker Control ---

    def get_status(self):
        """Returns the current running status of the tracker and individual cameras."""
        with self.tracker_lock:
            return {
                "is_service_running": self.is_running,
                "camera_statuses": self.camera_status.copy()
            }

    def start_camera(self, camera_id: int) -> bool:
        """Starts processing for a single camera."""
        with self.tracker_lock:
            if camera_id not in self.camera_configs:
                print(f"[SYSTEM-ERROR] Attempted to start non-existent camera ID: {camera_id}")
                return False
            if self.camera_status.get(camera_id) == 'running':
                print(f"[SYSTEM-WARN] Camera {camera_id} is already running.")
                return False
            
            camera_config = self.camera_configs[camera_id]
            shutdown_event = threading.Event()
            self.camera_shutdown_events[camera_id] = shutdown_event

            thread = threading.Thread(
                target=self.process_camera,
                args=(camera_config, shutdown_event),
                daemon=True
            )
            thread.start()
            self.camera_threads[camera_id] = thread
            self.camera_status[camera_id] = 'running'
            print(f"[SYSTEM] Started processing for camera '{camera_config['camera_name']}' (ID: {camera_id}).")
            return True

    def stop_camera(self, camera_id: int) -> bool:
        """Stops processing for a single camera."""
        with self.tracker_lock:
            if self.camera_status.get(camera_id) != 'running':
                print(f"[SYSTEM-WARN] Camera {camera_id} is not currently running.")
                return False
            
            shutdown_event = self.camera_shutdown_events.get(camera_id)
            thread = self.camera_threads.get(camera_id)

            if shutdown_event and thread:
                print(f"[SYSTEM] Stopping processing for camera ID: {camera_id}...")
                shutdown_event.set()
                thread.join(timeout=5)
                if thread.is_alive():
                    print(f"[SYSTEM-ERROR] Camera {camera_id} thread did not terminate in time.")
                
                del self.camera_shutdown_events[camera_id]
                del self.camera_threads[camera_id]
            
            self.camera_status[camera_id] = 'stopped'
            print(f"[SYSTEM] Stopped processing for camera ID: {camera_id}.")
            return True

    def start_tracking(self):
        """Starts the face tracking service for all configured cameras."""
        with self.tracker_lock:
            if self.is_running:
                print("[SYSTEM-WARN] Tracker service is already running.")
                return False
            
            print("[SYSTEM] Starting face tracking service for all cameras...")
            for cam_id in self.camera_configs.keys():
                self.start_camera(cam_id)
            self.is_running = True
            return True

    def stop_tracking(self):
        """Stops the face tracking service for all running cameras."""
        with self.tracker_lock:
            if not self.is_running and not any(status == 'running' for status in self.camera_status.values()):
                print("[SYSTEM-WARN] Tracker service is not currently running.")
                return False

            print("\n[SYSTEM] Stopping face tracking service for all cameras...")
            # Iterate over a copy of keys since stop_camera modifies the dictionary
            for cam_id in list(self.camera_threads.keys()):
                self.stop_camera(cam_id)
            
            self.is_running = False
            return True

    def get_latest_raw_frame(self, camera_id: int) -> Optional[np.ndarray]:
        """Gets the latest raw (unannotated) frame for a given camera."""
        if camera_id not in self.raw_frame_locks:
            return None
        with self.raw_frame_locks[camera_id]:
            frame = self.latest_raw_frames.get(camera_id)
            return frame.copy() if frame is not None else None

    def get_latest_tracking_data(self, camera_id: int) -> Optional[TrackingData]:
        """Gets the latest tracking data (identities, bboxes) for a given camera."""
        if camera_id not in self.tracking_data_locks:
            return None
        with self.tracking_data_locks[camera_id]:
            data = self.latest_tracking_data.get(camera_id)
            return TrackingData(identities=list(data.identities), scores=list(data.scores), bboxes=list(data.bboxes)) if data else None
            
    def get_camera_config(self, camera_id: int) -> Optional[dict]:
        """Gets the configuration for a specific camera."""
        return self.camera_configs.get(camera_id)

    def _initialize_faiss(self):
        if self.embeddings.size > 0:
            self.embeddings = np.array(self.embeddings).astype('float32')
            faiss.normalize_L2(self.embeddings)
            self.index = faiss.IndexFlatIP(self.embeddings.shape[1])
            self.index.add(self.embeddings) # type: ignore
            print(f"[FAISS] Search index successfully built with {self.index.ntotal} embeddings.")
        else:
            self.index = None
            print("[FAISS-WARN] No face embeddings found in database. Recognition will not be possible until users are enrolled.")

    def _initialize_multi_gpu_insightface(self):
        gpu_ids = list(set(cam['gpu_id'] for cam in self.camera_configs.values()))
        print(f"[INSIGHTFACE] Initializing face analysis models for GPU(s): {gpu_ids}")
        for gpu_id in gpu_ids:
            providers = ['CPUExecutionProvider']
            if torch.cuda.is_available() and gpu_id < torch.cuda.device_count():
                providers = [('CUDAExecutionProvider', {'device_id': gpu_id}), 'CPUExecutionProvider']
                print(f"[INSIGHTFACE] GPU {gpu_id} is available. Using CUDAExecutionProvider.")
            else:
                print(f"[INSIGHTFACE-WARN] GPU ID {gpu_id} is not available. Falling back to CPU.")
            det_thresh = self.tuning_settings.get('detection_threshold', 0.5)
            self.apps[gpu_id] = FaceAnalysis(
                name='antelopev2', 
                providers=providers,
                allowed_modules=['detection', 'recognition'])
            self.apps[gpu_id].prepare(
                ctx_id=gpu_id, 
                det_size=(416, 416), 
                det_thresh=det_thresh)
            print(f"[INSIGHTFACE] Model for GPU {gpu_id} initialized with a detection threshold of {det_thresh}.")

    def _initialize_cameras(self):
        for cam_config in self.camera_configs_list:
            cam_id = cam_config['id']
            cam_name = cam_config['camera_name']
            self.trackers[cam_id] = BYTETracker(
                frame_rate=cam_config['fps'],
                track_buffer=TRACK_BUFFER_SIZE,
                match_thresh=self.tuning_settings.get('match_threshold', 0.8))
            self.frame_locks[cam_id] = threading.Lock()
            self.latest_frames[cam_id] = None
            self.latest_faces[cam_id] = []
            self.frame_skip_counter[cam_id] = 0
            self.detection_interval[cam_id] = 3
            self.track_identities[cam_id] = {}
            print(f"[CAMERA] ByteTracker initialized for '{cam_name}' (ID: {cam_id}).")

    def _enhance_frame_for_cctv(self, frame, output_buffer=None):
        lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        l = clahe.apply(l)
        enhanced_lab = cv2.merge([l, a, b])
        enhanced_frame = cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2BGR)
        enhanced_frame = cv2.GaussianBlur(enhanced_frame, (3, 3), 0.5)
        return enhanced_frame

    def _adaptive_detection_interval(self, camera_id: int, num_faces: int):
        if num_faces == 0:
            self.detection_interval[camera_id] = min(5, self.detection_interval[camera_id] + 1)
        elif num_faces > 3:
            self.detection_interval[camera_id] = max(2, self.detection_interval[camera_id] - 1)
        else:
            self.detection_interval[camera_id] = 3

    def _frame_processor_thread(self, camera_config):
        cam_id = camera_config['id']
        gpu_id = camera_config['gpu_id']
        while not self.global_shutdown_flag.is_set():
            try:
                frame_data = self.frame_queues[cam_id].get(timeout=1.0)
                if frame_data is None:
                    break
                frame, timestamp = frame_data
                enhanced_frame = self._enhance_frame_for_cctv(frame)
                height, width = enhanced_frame.shape[:2]
                scale_factor = 1.0
                if width > 960:
                    scale_factor = 960 / width
                    new_width = int(width * scale_factor)
                    new_height = int(height * scale_factor)
                    enhanced_frame = cv2.resize(enhanced_frame, (new_width, new_height))
                future = self.detection_pools[gpu_id].submit(self._detect_faces, enhanced_frame, gpu_id, scale_factor)
                try:
                    faces = future.result(timeout=0.5)
                    self.result_queues[cam_id].put((faces, timestamp), timeout=0.1)
                except Exception as e:
                    if not self.global_shutdown_flag.is_set():
                        print(f"[PROCESSOR-ERROR] Face detection task failed for Camera ID {cam_id}. Details: {repr(e)}")
                self.memory_pool.return_frame_buffer(enhanced_frame)
            except queue.Empty:
                continue
            except Exception as e:
                if not self.global_shutdown_flag.is_set():
                    print(f"[PROCESSOR-ERROR] Main loop failed for Camera ID {cam_id}. Details: {repr(e)}")

    def _detect_faces(self, enhanced_frame, gpu_id, scale_factor):
        faces = self.apps[gpu_id].get(enhanced_frame)
        if scale_factor != 1.0:
            for face in faces:
                face.bbox = [int(x / scale_factor) for x in face.bbox]
        return faces

    def _face_detection_thread(self, camera_config):
        cam_id = camera_config['id']
        gpu_id = camera_config['gpu_id']
        print(f"[DETECTION] Starting face detection for camera {cam_id} on GPU {gpu_id}")
        while not self.global_shutdown_flag.is_set():
            try:
                current_time = time.time()
                if current_time - self.last_faces_reload > 300:
                    new_embeddings, new_labels = db_utils.get_all_face_embeddings()
                    if new_embeddings.size > 0:
                        with self.faiss_index_lock:
                            self.embeddings = np.array(new_embeddings).astype('float32')
                            self.labels = new_labels
                            faiss.normalize_L2(self.embeddings)
                            self.index = faiss.IndexFlatIP(self.embeddings.shape[1])
                            self.index.add(self.embeddings) # type: ignore
                            with self.embedding_cache_lock:
                                self.embedding_cache.clear()
                        print(f"[RELOAD] Updated face database with {len(new_embeddings)} embeddings")
                        self.last_faces_reload = current_time
                with self.frame_locks[cam_id]:
                    if self.latest_frames[cam_id] is None:
                        time.sleep(0.02)
                        continue
                    frame_copy = self.latest_frames[cam_id].copy()
                self.frame_skip_counter[cam_id] += 1
                if self.frame_skip_counter[cam_id] < self.detection_interval[cam_id]:
                    time.sleep(0.01)
                    continue
                self.frame_skip_counter[cam_id] = 0
                enhanced_frame = self._enhance_frame_for_cctv(frame_copy)
                height, width = enhanced_frame.shape[:2]
                scale_factor = 1.0
                if width > 960:
                    scale_factor = 960 / width
                    new_width = int(width * scale_factor)
                    new_height = int(height * scale_factor)
                    enhanced_frame = cv2.resize(enhanced_frame, (new_width, new_height))
                faces = self.apps[gpu_id].get(enhanced_frame)
                if scale_factor != 1.0:
                    for face in faces:
                        face.bbox = [int(x / scale_factor) for x in face.bbox]
                with self.frame_locks[cam_id]:
                    self.latest_faces[cam_id] = faces
                self._adaptive_detection_interval(cam_id, len(faces))
            except Exception as e:
                if not self.global_shutdown_flag.is_set():
                    print(f"[DETECTION ERROR] Camera {cam_id}: {e}")
                time.sleep(0.1)

    def _compute_embedding_similarity(self, embedding: np.ndarray) -> Tuple[str, float]:
        embedding_buffer = self.memory_pool.get_embedding_buffer()
        np.copyto(embedding_buffer[:len(embedding)], embedding)
        emb_hash = hash(embedding_buffer[:len(embedding)].tobytes()[:64])
        with self.embedding_cache_lock:
            if emb_hash in self.embedding_cache:
                result = self.embedding_cache[emb_hash]
                self.memory_pool.return_embedding_buffer(embedding_buffer)
                return result
        with self.faiss_index_lock:
            if self.index is None or self.index.ntotal == 0 or len(self.labels) == 0:
                self.memory_pool.return_embedding_buffer(embedding_buffer)
                return "unknown", 0.0
            embedding_slice = embedding_buffer[:len(embedding)]
            if embedding_slice.size == 0:
                self.memory_pool.return_embedding_buffer(embedding_buffer)
                return "unknown", 0.0
            emb_norm = np.linalg.norm(embedding_slice)
            if emb_norm > 0:
                embedding_buffer[:len(embedding)] /= emb_norm
            else:
                self.memory_pool.return_embedding_buffer(embedding_buffer)
                return "unknown", 0.0
            try:
                k = min(3, len(self.labels))
                distances, indices = self.index.search(embedding_buffer[:len(embedding)].reshape(1, -1), k) # type: ignore
                if len(distances[0]) > 0 and len(indices[0]) > 0:
                    best_scores = distances[0]
                    best_indices = indices[0]
                    weighted_scores = {}
                    threshold = self.tuning_settings.get('recognition_threshold', 0.6)
                    for score, idx in zip(best_scores, best_indices):
                        if score > threshold and idx < len(self.labels):
                            identity = self.labels[idx]
                            weighted_scores[identity] = max(weighted_scores.get(identity, 0), score)
                    if weighted_scores:
                        best_identity = max(weighted_scores.items(), key=lambda x: x[1])
                        result = (best_identity[0], float(best_identity[1]))
                    else:
                        result = ("unknown", 0.0)
                else:
                    result = ("unknown", 0.0)
            except Exception as e:
                print(f"[RECOGNITION-ERROR] FAISS search failed. Details: {repr(e)}")
                result = ("unknown", 0.0)
        with self.embedding_cache_lock:
            if len(self.embedding_cache) < 500:
                self.embedding_cache[emb_hash] = result
        self.memory_pool.return_embedding_buffer(embedding_buffer)
        return result

    def _temporal_smoothing(self, identity: str, score: float, camera_id: int) -> Tuple[str, float]:
        current_time = time.time()
        track_key = f"{camera_id}_{identity}"
        if track_key not in self.track_identities[camera_id]:
            self.track_identities[camera_id][track_key] = {
                'votes': deque(maxlen=5),
                'last_update': current_time}
        track_data = self.track_identities[camera_id][track_key]
        if current_time - track_data['last_update'] > 2.0:
            track_data['votes'].clear()
        track_data['votes'].append((identity, score))
        track_data['last_update'] = current_time
        if len(track_data['votes']) >= 3:
            identity_counts = {}
            total_score = 0
            for vote_identity, vote_score in track_data['votes']:
                if vote_identity in identity_counts:
                    identity_counts[vote_identity] = max(identity_counts[vote_identity], vote_score)
                else:
                    identity_counts[vote_identity] = vote_score
                total_score += vote_score
            if identity_counts:
                best_identity = max(identity_counts.items(), key=lambda x: x[1])
                avg_score = total_score / len(track_data['votes'])
                return best_identity[0], min(best_identity[1], float(avg_score))
        return identity, score

    def _quality_filter(self, face, frame_width: int, frame_height: int) -> Tuple[bool, FaceQualityMetrics]:
        bbox = face.bbox.astype(int)
        face_width = bbox[2] - bbox[0]
        face_height = bbox[3] - bbox[1]
        size_score = min(1.0, (face_width * face_height) / (100 * 100))
        if face_width < 50 or face_height < 50:
            size_score = 0.0
        if face_width > frame_width * 0.8 or face_height > frame_height * 0.8:
            size_score = 0.0
        center_x = (bbox[0] + bbox[2]) / 2
        center_y = (bbox[1] + bbox[3]) / 2
        distance_from_center = np.sqrt((center_x - frame_width/2)**2 + (center_y - frame_height/2)**2)
        max_distance = np.sqrt((frame_width/2)**2 + (frame_height/2)**2)
        position_score = 1.0 - (distance_from_center / max_distance)
        det_score = face.det_score if hasattr(face, 'det_score') else 0.5
        brightness_score = self._compute_brightness_score(face, bbox)
        sharpness_score = self._compute_sharpness_score(face, bbox)
        angle_score = self._compute_face_angle_score(face)
        overall_quality = (
            0.3 * size_score +
            0.2 * position_score +
            0.2 * det_score +
            0.1 * brightness_score +
            0.1 * sharpness_score +
            0.1 * angle_score)
        quality_metrics = FaceQualityMetrics(
            sharpness_score=sharpness_score,
            brightness_score=brightness_score,
            angle_score=angle_score,
            size_score=size_score,
            overall_quality=overall_quality)
        is_valid = overall_quality >= self.tuning_settings.get('face_quality_threshold', 0.65)
        return is_valid, quality_metrics

    def _adaptive_threshold(self, identity: str, base_score: float) -> float:
        if identity in self.global_tracks:
            track = self.global_tracks[identity]
            recent_scores = list(track.embedding_history)[-10:] if hasattr(track, 'embedding_history') else []
            if len(recent_scores) >= 5:
                avg_recent_score = np.mean([self._compute_embedding_similarity(emb)[1] for emb in recent_scores])
                if avg_recent_score > 0.8:
                    return self.tuning_settings.get('recognition_threshold', 0.6) * 0.9
                elif avg_recent_score < 0.6:
                    return self.tuning_settings.get('recognition_threshold', 0.6) * 1.1
        return self.tuning_settings.get('recognition_threshold', 0.6)

    def _compute_brightness_score(self, face, bbox) -> float:
        try:
            if hasattr(face, 'landmark_2d_106'):
                landmarks = face.landmark_2d_106
                if landmarks is not None and len(landmarks) > 0:
                    avg_intensity = np.mean(landmarks) / 255.0
                    return float(min(1.0, max(0.0, 1.0 - abs(avg_intensity - 0.5) * 2)))
            return 0.5
        except:
            return 0.5

    def _compute_sharpness_score(self, face, bbox) -> float:
        try:
            if hasattr(face, 'embedding'):
                embedding_var = np.var(face.embedding)
                normalized_var = min(1.0, embedding_var / 0.1)
                return float(normalized_var)
            return 0.5
        except:
            return 0.5

    def _compute_face_angle_score(self, face) -> float:
        try:
            if hasattr(face, 'pose'):
                yaw, pitch, roll = face.pose
                angle_penalty = (abs(yaw) + abs(pitch) + abs(roll)) / 90.0
                return float(max(0.0, 1.0 - angle_penalty))
            return 0.8
        except:
            return 0.8

    def _update_embeddings(self, identity: str, embedding: np.ndarray):
        current_time = time.time()
        with self.embedding_update_lock:
            if identity in self.last_embedding_update:
                if current_time - self.last_embedding_update[identity] < self.tuning_settings.get('embedding_update_cooldown', 60):
                    return False
            emb_norm = np.linalg.norm(embedding)
            if emb_norm > 0:
                embedding = embedding / emb_norm
            else:
                return False
            try:
                self.embedding_update_queue.put((identity, embedding, current_time), timeout=0.1)
                self.last_embedding_update[identity] = current_time
                return True
            except queue.Full:
                return False

    def _embedding_update_worker(self):
        print("[UPDATE-WORKER] Background embedding update service started.")
        pending_updates = []
        last_batch_time = time.time()
        while not self.global_shutdown_flag.is_set():
            try:
                current_time = time.time()
                try:
                    priority, update = self.embedding_update_queue.get(timeout=0.5)
                    if update is None:
                        break
                    pending_updates.append(update)
                except queue.Empty:
                    if pending_updates and (current_time - last_batch_time > 2.0):
                        self._process_pending_updates(pending_updates)
                        pending_updates = []
                        last_batch_time = current_time
                    continue
                if len(pending_updates) >= self.batch_update_threshold or (current_time - last_batch_time > 5.0):
                    self._process_pending_updates(pending_updates)
                    pending_updates = []
                    last_batch_time = current_time
            except Exception as e:
                print(f"[UPDATE-WORKER-ERROR] An exception occurred: {repr(e)}")
                time.sleep(0.1)
        if pending_updates:
            self._process_pending_updates(pending_updates)
        print("[UPDATE-WORKER] Embedding update service stopped.")

    def _process_pending_updates(self, pending_updates):
        with self.embedding_update_lock:
            for identity, embedding, timestamp in pending_updates:
                user_record = db_utils.get_user_by_employee_id(identity)
                if user_record:
                    user_id = user_record[0]
                    new_embedding_id = db_utils.add_face_embedding(user_id, embedding, b'', 'update')
                    if new_embedding_id:
                        print(f"[EMBEDDING] Dynamically saved new embedding (ID: {new_embedding_id}) for employee '{identity}'.")
            self.updates_since_last_rebuild += len(pending_updates)
            if self.updates_since_last_rebuild >= self.max_updates_before_rebuild:
                print(f"[REBUILD] Update threshold met ({self.updates_since_last_rebuild}/{self.max_updates_before_rebuild}). Rebuilding FAISS index...")
                new_embeddings, new_labels = db_utils.get_all_face_embeddings()
                if new_embeddings.size > 0:
                    with self.faiss_index_lock:
                        self.embeddings = np.array(new_embeddings).astype('float32')
                        self.labels = new_labels
                        faiss.normalize_L2(self.embeddings)
                        self.index = faiss.IndexFlatIP(self.embeddings.shape[1])
                        self.index.add(self.embeddings) # type: ignore
                        with self.embedding_cache_lock:
                            self.embedding_cache.clear()
                    print(f"[REBUILD] FAISS index rebuilt successfully with {self.index.ntotal} total embeddings.")
                    self.updates_since_last_rebuild = 0

    def _get_consistent_track_id(self, identity: str, camera_id: int) -> str:
        current_time = time.time()
        if identity == "unknown":
            return f"unknown_{camera_id}_{int(current_time)}"
        with self.global_tracks_lock:
            if identity in self.identity_tracks:
                self.identity_last_seen[identity] = current_time
                self.identity_cameras[identity] = camera_id
                return self.identity_tracks[identity]
            track_id = identity
            self.identity_tracks[identity] = track_id
            self.identity_last_seen[identity] = current_time
            self.identity_cameras[identity] = camera_id
            self.identity_positions[identity] = {}
            self.identity_trip_logged[identity] = set()
            self.identity_crossing_state[identity] = {}
            self.identity_zone_state[identity] = {}
            return track_id

    def _update_work_status(self, identity: str, camera_id: int, direction: str):
        if identity not in self.global_tracks:
            return
        track = self.global_tracks[identity]
        if camera_id == 0 and direction == "left->right":
            track.work_status = "working"
            self._log_event(identity, camera_id, "WorkAreaEntry")
        elif camera_id == 1 and direction == "right->left":
            track.work_status = "working"
            self._log_event(identity, camera_id, "WorkAreaEntry")
        elif camera_id == 0 and direction == "right->left":
            track.work_status = "on_break"
            self._log_event(identity, camera_id, "WorkAreaExit")
        elif camera_id == 1 and direction == "left->right":
            track.work_status = "on_break"
            self._log_event(identity, camera_id, "WorkAreaExit")
        elif camera_id == 0 and direction == "top->bottom":
            track.work_status = "working"
            self._log_event(identity, camera_id, "WorkAreaEntry")
        elif camera_id == 1 and direction == "bottom->top":
            track.work_status = "working"
            self._log_event(identity, camera_id, "WorkAreaEntry")
        elif camera_id == 0 and direction == "bottom->top":
            track.work_status = "on_break"
            self._log_event(identity, camera_id, "WorkAreaExit")
        elif camera_id == 1 and direction == "top->bottom":
            track.work_status = "on_break"
            self._log_event(identity, camera_id, "WorkAreaExit")

    def _log_event(self, identity: str, camera_id: int, event: str):
        event_type = "check_in" if event in ["entry", "WorkAreaEntry"] else "check_out"
        user_record = db_utils.get_user_by_employee_id(identity)
        if not user_record:
            print(f"[EVENT-ERROR] Could not log event. No database record found for employee ID '{identity}'.")
            return
        user_id = user_record[0]
        db_utils.log_attendance_event(user_id, event_type, camera_id)
        print(f"[EVENT] Logged '{event_type}' for employee '{identity}' from Camera ID {camera_id}.")
        self.api_logger.log_attendance_async(identity, event_type)

    def _check_tripwire_crossing(self, identity: str, center_x: int, center_y: int, camera_config: dict, frame_width: int, frame_height: int):
        current_time = time.time()
        camera_key = f"{camera_config['id']}"
        if identity not in self.identity_crossing_state:
            self.identity_crossing_state[identity] = {}
        if camera_key not in self.identity_crossing_state[identity]:
            self.identity_crossing_state[identity][camera_key] = {}
        for tripwire in camera_config.get('tripwires', []):
            tripwire_key = f"{tripwire['name']}"
            if tripwire_key not in self.identity_crossing_state[identity][camera_key]:
                self.identity_crossing_state[identity][camera_key][tripwire_key] = {
                    'state': 'none',
                    'last_position': center_x if tripwire['direction'] == 'vertical' else center_y,
                    'direction': None}
            state_info = self.identity_crossing_state[identity][camera_key][tripwire_key]
            if tripwire['direction'] == 'vertical':
                tripwire1_pos = int(frame_width * (tripwire['position'] - tripwire['spacing']/2))
                tripwire2_pos = int(frame_width * (tripwire['position'] + tripwire['spacing']/2))
                current_pos = center_x
                if state_info['state'] == 'none':
                    if current_pos < tripwire1_pos:
                        state_info['state'] = 'left_zone'
                        state_info['direction'] = 'left->right'
                    elif current_pos > tripwire2_pos:
                        state_info['state'] = 'right_zone'
                        state_info['direction'] = 'right->left'
                elif state_info['state'] == 'left_zone' and state_info['direction'] == 'left->right':
                    if current_pos > tripwire2_pos:
                        self._log_event(identity, camera_config['id'], tripwire['name'])
                        state_info['state'] = 'none'
                        state_info['direction'] = None
                elif state_info['state'] == 'right_zone' and state_info['direction'] == 'right->left':
                    if current_pos < tripwire1_pos:
                        self._log_event(identity, camera_config['id'], tripwire['name'])
                        state_info['state'] = 'none'
                        state_info['direction'] = None
            else:
                tripwire1_pos = int(frame_height * (tripwire['position'] - tripwire['spacing']/2))
                tripwire2_pos = int(frame_height * (tripwire['position'] + tripwire['spacing']/2))
                current_pos = center_y
                if state_info['state'] == 'none':
                    if current_pos < tripwire1_pos:
                        state_info['state'] = 'top_zone'
                        state_info['direction'] = 'top->bottom'
                    elif current_pos > tripwire2_pos:
                        state_info['state'] = 'bottom_zone'
                        state_info['direction'] = 'bottom->top'
                elif state_info['state'] == 'top_zone' and state_info['direction'] == 'top->bottom':
                    if current_pos > tripwire2_pos:
                        self._log_event(identity, camera_config['id'], tripwire['name'])
                        state_info['state'] = 'none'
                        state_info['direction'] = None
                elif state_info['state'] == 'bottom_zone' and state_info['direction'] == 'bottom->top':
                    if current_pos < tripwire1_pos:
                        self._log_event(identity, camera_config['id'], tripwire['name'])
                        state_info['state'] = 'none'
                        state_info['direction'] = None
            state_info['last_position'] = current_pos

    def process_camera(self, camera_config: Dict, shutdown_event: threading.Event):
        cam_id = camera_config['id']
        cam_name = camera_config['camera_name']
        stream_url = camera_config['stream_url']
        
        # The loop now checks the specific shutdown event for this camera thread
        while not shutdown_event.is_set():
            cap = None
            try:
                cap = cv2.VideoCapture(int(stream_url) if stream_url.isdigit() else stream_url)
                if not cap.isOpened():
                    print(f"[CAMERA-ERROR] Cannot open video stream for '{cam_name}'. Retrying in 5 seconds...")
                    time.sleep(5)
                    continue
                cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                prev_time = 0
                while not shutdown_event.is_set():
                    current_time = time.time()
                    if current_time - prev_time < FRAME_INTERVAL:
                        time.sleep(0.005)
                        continue
                    ret, frame = cap.read()
                    if not ret:
                        print(f"[CAMERA-WARN] Frame read failed for '{cam_name}'. Re-initializing capture...")
                        break 
                    prev_time = current_time

                    with self.raw_frame_locks[cam_id]:
                        self.latest_raw_frames[cam_id] = frame
                    
                    try:
                        frame_buffer = self.memory_pool.get_frame_buffer(frame.shape)
                        np.copyto(frame_buffer, frame)
                        self.frame_queues[cam_id].put((frame_buffer, current_time), timeout=0.01)
                    except queue.Full: pass

                    try:
                        faces, timestamp = self.result_queues[cam_id].get_nowait()
                        identities, scores, bboxes = self._process_faces(faces, cam_id, camera_config, frame.shape[1], frame.shape[0], timestamp)
                        
                        with self.tracking_data_locks[cam_id]:
                            self.latest_tracking_data[cam_id] = TrackingData(identities=identities, scores=scores, bboxes=bboxes)

                    except queue.Empty:
                        with self.tracking_data_locks[cam_id]:
                           self.latest_tracking_data[cam_id] = TrackingData()

            except Exception as e:
                print(f"[CRITICAL-CAMERA-ERROR] Unhandled exception in camera thread for '{cam_name}': {e}. Restarting thread in 10 seconds.")
                time.sleep(10)
            finally:
                if cap and cap.isOpened():
                    cap.release()
        
        print(f"[CAMERA-THREAD] Gracefully stopped for '{cam_name}' (ID: {cam_id}).")


    def _process_faces(self, faces, cam_id, camera_config, frame_width, frame_height, timestamp):
        valid_faces = []
        identities = []
        scores = []
        bboxes = []
        for face in faces:
            is_valid, quality_metrics = self._quality_filter(face, frame_width, frame_height)
            if is_valid:
                valid_faces.append(face)
        embeddings_batch = [face.embedding.astype('float32') for face in valid_faces]
        bboxes_batch = [face.bbox.astype(int) for face in valid_faces]
        if not embeddings_batch:
            return identities, scores, bboxes
        identities_batch = []
        scores_batch = []
        for embedding in embeddings_batch:
            identity, score = self._compute_embedding_similarity(embedding)
            identities_batch.append(identity)
            scores_batch.append(score)
        for i, (identity, score, bbox, embedding) in enumerate(zip(identities_batch, scores_batch, bboxes_batch, embeddings_batch)):
            identities.append(identity)
            scores.append(score)
            bboxes.append(bbox)
            if identity == "unknown":
                continue
            adaptive_thresh = self._adaptive_threshold(identity, score)
            if score < adaptive_thresh:
                continue
            center_x = int((bbox[0] + bbox[2]) / 2)
            center_y = int((bbox[1] + bbox[3]) / 2)
            if identity not in self.kalman_trackers:
                self.kalman_trackers[identity] = KalmanTracker(self.tuning_settings)
            smoothed_position = self.kalman_trackers[identity].update(center_x, center_y)
            with self.global_tracks_lock:
                if identity not in self.global_tracks:
                    self.global_tracks[identity] = GlobalTrack(
                        employee_id=identity,
                        last_seen_time=timestamp,
                        last_camera_id=cam_id,
                        embedding_history=deque(maxlen=EMBEDDING_HISTORY_SIZE),
                        work_status="working")
                track = self.global_tracks[identity]
                track.last_seen_time = timestamp
                track.last_camera_id = cam_id
                track.confidence_score = score
                track.embedding_history.append(embedding)
            self._check_tripwire_crossing(identity, smoothed_position[0], smoothed_position[1], camera_config, frame_width, frame_height)
            if score > 0.8:
                can_update = False
                with self.embedding_update_lock:
                    current_time = time.time()
                    cooldown = self.tuning_settings.get('embedding_update_cooldown', 60)
                    last_update_time = self.last_embedding_update.get(identity, 0)
                    if current_time - last_update_time > cooldown:
                        self.last_embedding_update[identity] = current_time
                        can_update = True
                if can_update:
                    priority = -score
                    try:
                        self.embedding_update_queue.put((priority, (identity, embedding, current_time)), timeout=0.01)
                    except queue.Full:
                        pass
        return identities, scores, bboxes

    def _cleanup_old_tracks(self):
        current_time = time.time()
        expired_tracks = []
        with self.global_tracks_lock:
            for identity, track in list(self.global_tracks.items()):
                if current_time - track.last_seen_time > GLOBAL_TRACK_TIMEOUT:
                    expired_tracks.append(identity)
            for identity in expired_tracks:
                del self.global_tracks[identity]
                if identity in self.kalman_trackers:
                    del self.kalman_trackers[identity]
                if identity in self.tracking_states:
                    del self.tracking_states[identity]
        if expired_tracks:
            print(f"[CLEANUP] Removed {len(expired_tracks)} expired global tracks due to timeout.")

    def shutdown(self):
        """Fully shuts down the tracker and all its sub-processes."""
        print("\n[SYSTEM] Full shutdown initiated...")
        self.global_shutdown_flag.set() # Signal auxiliary threads to stop
        self.stop_tracking() # Ensure all camera threads are stopped first

        if self.embedding_update_worker and self.embedding_update_worker.is_alive():
            try:
                self.embedding_update_queue.put((0, None), timeout=1.0)
            except queue.Full:
                pass
            self.embedding_update_worker.join(timeout=5)
        
        for processor in self.frame_processors:
            if processor.is_alive():
                processor.join(timeout=3)
        self.thread_pool.shutdown(wait=True)
        for pool in self.detection_pools.values():
            pool.shutdown(wait=True)
        
        print("[SYSTEM] All services have been stopped. Shutdown complete.")

