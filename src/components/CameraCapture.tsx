/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect, ChangeEvent } from 'react';
import { Camera, RefreshCw, Upload, Image as ImageIcon, AlertCircle } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (base64Image: string) => void;
  onClear: () => void;
}

export function CameraCapture({ onCapture, onClear }: CameraCaptureProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [loadingCamera, setLoadingCamera] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stop camera stream safely
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setStream(null);
    setIsCameraActive(false);
  };

  // Start camera stream safely
  const startCamera = async () => {
    setLoadingCamera(true);
    setCameraError(null);
    try {
      // Clean previous stream if any
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      let mediaStream: MediaStream;
      try {
        // Primary attempt: Request front camera (user facing) with standard constraints
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        });
      } catch (firstErr) {
        console.warn('Front camera constraints failed. Trying general video fallback...', firstErr);
        // Fallback 1: Try without specific facingMode or dimensions
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        } catch (secondErr) {
          console.warn('General video API failed. Trying direct browser fallback...', secondErr);
          throw secondErr;
        }
      }

      streamRef.current = mediaStream;
      setStream(mediaStream);
      setIsCameraActive(true);
      setCapturedImage(null);
      onClear();

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch((err) => {
          console.error("Video play error:", err);
        });
      }
    } catch (err: any) {
      console.error('Camera initialization error:', err);
      // Construct a very clear error message in English to help employees grant permissions
      setCameraError(
        'Camera could not be initialized. Please check your browser settings and ensure camera permission is Allowed (Or open this link directly in Google Chrome/Safari instead of the built-in WhatsApp/Facebook browser which block cameras).'
      );
    } finally {
      setLoadingCamera(false);
    }
  };

  // Capture photo from video stream
  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      const width = video.videoWidth || 640;
      const height = video.videoHeight || 480;

      canvas.width = width;
      canvas.height = height;

      if (context) {
        // Draw the current video frame on canvas
        context.drawImage(video, 0, 0, width, height);
        
        // Compress to jpeg quality 0.85
        const base64 = canvas.toDataURL('image/jpeg', 0.85);
        setCapturedImage(base64);
        onCapture(base64);
        
        // Auto-stop camera to save battery
        stopCamera();
      }
    }
  };

  // Native camera/file upload fallback handler (important for WhatsApp webviews)
  const handleFileCapture = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setCapturedImage(result);
        onCapture(result);
        stopCamera();
      };
      reader.readAsDataURL(file);
    }
  };

  // Recapture trigger
  const handleRecapture = () => {
    setCapturedImage(null);
    onClear();
    startCamera();
  };

  // Auto-start camera on mounts
  useEffect(() => {
    startCamera();
    return () => {
      // Cleanup stream on component unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center">
      {/* Viewfinder/Preview Container */}
      <div className="relative w-full max-w-sm aspect-[4/3] bg-zinc-950 rounded-2xl overflow-hidden shadow-inner border border-zinc-200/50 flex flex-col justify-center items-center">
        {capturedImage ? (
          // Captured Image view
          <img
            src={capturedImage}
            alt="Captured attendance verification photo"
            className="w-full h-full object-cover transition-opacity duration-300"
          />
        ) : isCameraActive ? (
          // Active Camera Feed
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover transform -scale-x-100"
          />
        ) : (
          // Missing camera/inactive layout placeholder
          <div className="text-center p-6 text-zinc-400 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-300">
              <Camera className="w-6 h-6 animate-pulse" />
            </div>
            {loadingCamera ? (
              <p className="text-xs font-semibold">Camera is initializing...</p>
            ) : (
              <div className="max-w-[260px] flex flex-col items-center gap-2">
                <p className="text-sm font-semibold mb-1 text-zinc-300">Camera is inactive (or permission is blocked)</p>
                <div className="flex flex-col gap-2 w-full">
                  <button
                    onClick={startCamera}
                    className="text-[11px] bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold py-2 px-3 rounded-lg cursor-pointer transition-all border border-zinc-700"
                  >
                    🔄 Retry Camera
                  </button>
                  <button
                    onClick={() => document.getElementById('native-camera-input')?.click()}
                    className="text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-3 rounded-lg cursor-pointer transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    📷 Use Device Camera (Native Camera)
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Dynamic Scan lines / Overlays for verified status */}
        {!capturedImage && isCameraActive && (
          <div className="absolute inset-0 pointer-events-none border-[3px] border-emerald-500/30 rounded-2xl m-3">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-500 rounded-tl"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-500 rounded-tr"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-500 rounded-bl"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-500 rounded-br"></div>
            {/* Soft scan animation line */}
            <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent absolute top-1/2 left-0 animate-[bounce_3s_infinite]" />
          </div>
        )}

        {capturedImage && (
          <div className="absolute top-3 right-3 bg-emerald-600/90 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase shadow-md flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            Photo Captured
          </div>
        )}
      </div>

      {/* Hidden Canvas utilities */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Camera Error Messaging with precise Hindish user instructions */}
      {cameraError && (
        <div className="mt-3 max-w-sm bg-rose-50 rounded-xl border border-rose-200 p-3.5 mx-4 text-left">
          <div className="flex gap-2.5 text-rose-800">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
            <div className="text-xs space-y-1.5 leading-normal">
              <span className="font-bold block text-rose-900 leading-tight">Camera Permission Blocked!</span>
              <p>{cameraError}</p>
              <div className="bg-white/60 p-2 rounded-lg border border-rose-100/80 font-medium text-[10px] text-zinc-650">
                <b>💡 How to allow permissions:</b>
                <ol className="list-decimal pl-3.5 mt-1 space-y-1">
                  <li>Tap the <b>Lock 🔒 / Settings Icon</b> in your phone address bar.</li>
                  <li>Navigate to <b>Site Settings / Permissions</b>.</li>
                  <li>Enable/Allow the <b>Camera</b> and refresh 🔄 this page.</li>
                  <li>Open the link directly in your phone browser like <b>Google Chrome / Safari</b> rather than inside WhatsApp.</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden standard file input that forces rear/front camera capture natively */}
      <input
        type="file"
        id="native-camera-input"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={handleFileCapture}
      />

      {/* Camera Capture and Controls Options Row */}
      <div className="flex flex-col sm:flex-row gap-2.5 mt-4 w-full justify-center px-4 max-w-sm">
        {!capturedImage ? (
          <>
            <button
              onClick={handleCapture}
              disabled={!isCameraActive}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-stone-50 font-bold text-xs py-3.5 px-4 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Camera className="w-4.5 h-4.5" />
              Capture Face
            </button>
            <button
              onClick={() => document.getElementById('native-camera-input')?.click()}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3.5 px-4 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer text-center"
              title="Click here if the live webcam isn't starting on your phone"
            >
              <Upload className="w-4 h-4" />
              Take Photo / Upload
            </button>
          </>
        ) : (
          <button
            onClick={handleRecapture}
            className="w-full max-w-[200px] bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-white font-bold text-xs py-3 px-5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Retake Photo
          </button>
        )}
      </div>
    </div>
  );
}
