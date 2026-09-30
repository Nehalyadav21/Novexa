/**
 * Mobile Optimization Utilities for WebRTC
 */

/**
 * Detect if the user is on a mobile device
 */
export const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

/**
 * Check if the device is iOS
 */
export const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

/**
 * Check if the device is Android
 */
export const isAndroid = () => {
  return /Android/.test(navigator.userAgent);
};

/**
 * Get optimal video constraints for mobile devices
 */
export const getMobileVideoConstraints = () => {
  const isPortrait = window.innerHeight > window.innerWidth;
  
  return {
    width: { 
      ideal: isPortrait ? 480 : 640, 
      max: isPortrait ? 640 : 1280 
    },
    height: { 
      ideal: isPortrait ? 640 : 480, 
      max: isPortrait ? 1280 : 720 
    },
    frameRate: { ideal: 15, max: 30 },
    facingMode: 'user' // Front camera for video calls
  };
};

/**
 * Get optimal audio constraints for mobile devices
 */
export const getMobileAudioConstraints = () => {
  return {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 44100
  };
};

/**
 * Check if the current connection is secure (HTTPS)
 * This is required for getUserMedia on mobile browsers
 */
export const isSecureContext = () => {
  return window.isSecureContext || location.protocol === 'https:' || location.hostname === 'localhost';
};

/**
 * Request permissions for camera and microphone with fallback
 */
export const requestMediaPermissions = async () => {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('getUserMedia is not supported in this browser');
  }

  if (!isSecureContext()) {
    throw new Error('Camera and microphone access requires HTTPS. Please access the site via HTTPS.');
  }

  const isMobile = isMobileDevice();
  
  const constraints = {
    video: isMobile ? getMobileVideoConstraints() : {
      width: { ideal: 1280, max: 1920 },
      height: { ideal: 720, max: 1080 },
      frameRate: { ideal: 30, max: 60 }
    },
    audio: isMobile ? getMobileAudioConstraints() : {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    }
  };

  try {
    // First attempt with full constraints
    console.log(`📱 Requesting ${isMobile ? 'mobile' : 'desktop'} media permissions...`);
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    console.log('✅ Full media permissions granted');
    return stream;
  } catch (error) {
    console.warn('⚠️ Full constraints failed, trying fallback...', error);
    
    // Fallback 1: Basic constraints
    try {
      const fallbackConstraints = {
        video: isMobile ? { facingMode: 'user' } : true,
        audio: true
      };
      const stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
      console.log('✅ Fallback media permissions granted');
      return stream;
    } catch (fallbackError) {
      console.warn('⚠️ Fallback failed, trying audio-only...', fallbackError);
      
      // Fallback 2: Audio only
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        console.log('✅ Audio-only permissions granted');
        return stream;
      } catch (audioError) {
        console.error('❌ All permission attempts failed');
        throw audioError;
      }
    }
  }
};

/**
 * Get user-friendly error message for media access errors
 */
export const getMediaErrorMessage = (error) => {
  const isMobile = isMobileDevice();
  
  switch (error.name) {
    case 'NotAllowedError':
      return isMobile 
        ? 'Camera and microphone access was denied. Please tap the camera icon in your browser\'s address bar and allow access, then refresh the page.'
        : 'Camera and microphone access was denied. Please check your browser settings and allow access.';
    
    case 'NotFoundError':
      return 'No camera or microphone found. Please check that your device has a camera and microphone, and they are not being used by another application.';
    
    case 'NotSupportedError':
      return isMobile
        ? 'Your browser doesn\'t support video calls. Please use Chrome, Safari, or Firefox on your mobile device.'
        : 'This browser doesn\'t support camera/microphone access. Please use a modern browser like Chrome, Firefox, or Safari.';
    
    case 'NotReadableError':
      return 'Camera or microphone is already in use by another application. Please close other apps that might be using your camera or microphone and try again.';
    
    case 'OverconstrainedError':
      return 'Camera settings are not supported by your device. The app will try to use basic settings instead.';
    
    case 'SecurityError':
      return !isSecureContext()
        ? 'Camera and microphone access requires a secure connection (HTTPS). Please access the site via HTTPS.'
        : 'Security settings prevent camera and microphone access. Please check your browser security settings.';
    
    default:
      return isMobile
        ? `Unable to access camera or microphone: ${error.message}. Please check your device settings and browser permissions.`
        : `Camera/microphone access failed: ${error.message}`;
  }
};

/**
 * Check if WebRTC is supported
 */
export const isWebRTCSupported = () => {
  return !!(
    window.RTCPeerConnection ||
    window.mozRTCPeerConnection ||
    window.webkitRTCPeerConnection
  ) && !!(
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia
  );
};

/**
 * Check mobile browser specific requirements
 */
export const checkMobileBrowserSupport = () => {
  const isMobile = isMobileDevice();
  
  if (!isMobile) {
    return { supported: true };
  }

  const userAgent = navigator.userAgent;
  
  // Check for known problematic browsers
  if (userAgent.includes('Instagram') || userAgent.includes('FBAN') || userAgent.includes('FBAV')) {
    return {
      supported: false,
      message: 'Video calls are not supported in social media app browsers. Please open this link in your default browser (Chrome, Safari, etc.)'
    };
  }

  if (userAgent.includes('WeChat')) {
    return {
      supported: false,
      message: 'Video calls are not supported in WeChat browser. Please open this link in your default browser.'
    };
  }

  // Check for minimum browser versions
  if (isIOS()) {
    const version = userAgent.match(/OS (\d+)_/);
    if (version && parseInt(version[1]) < 12) {
      return {
        supported: false,
        message: 'iOS 12 or later is required for video calls. Please update your device.'
      };
    }
  }

  if (isAndroid()) {
    const chromeVersion = userAgent.match(/Chrome\/(\d+)/);
    if (chromeVersion && parseInt(chromeVersion[1]) < 80) {
      return {
        supported: false,
        message: 'Chrome 80 or later is required for video calls. Please update your browser.'
      };
    }
  }

  return { supported: true };
};

/**
 * Optimize video element for mobile
 */
export const optimizeVideoForMobile = (videoElement) => {
  if (!isMobileDevice() || !videoElement) return;

  // Set mobile-specific attributes
  videoElement.setAttribute('playsinline', 'true');
  videoElement.setAttribute('webkit-playsinline', 'true');
  videoElement.muted = true; // Required for autoplay on mobile
  
  // Optimize for mobile performance
  videoElement.style.objectFit = 'cover';
  videoElement.style.transform = 'scaleX(-1)'; // Mirror for front camera
  
  return videoElement;
};
