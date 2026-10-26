'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Video,
  Image as ImageIcon,
  Sparkles,
  Play,
  RotateCcw,
  Download,
  Copy,
  Check,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Maximize2,
  Clock,
  Layers,
  ChevronDown,
  Info,
  LogIn,
  LogOut,
  RefreshCw,
  KeyRound,
  Loader2,
  CheckCircle2,
  Film,
  Clapperboard,
  ListOrdered,
  Edit3,
  Eye,
  Combine,
  X,
  PlayCircle,
  Users,
  Mic,
  Volume2,
  Sliders,
  ChevronRight,
  CreditCard,
  Coins,
  Zap,
  Trash2,
  Lock,
  Unlock,
  User as UserIcon,
  Shield,
} from 'lucide-react';

interface RenderItem {
  fileName: string;
  url: string;
  type: 'video' | 'image';
  createdAt: number;
  size: number;
}

export interface CharacterItem {
  id: string;
  name: string;
  role: string;
  faceAnchor: string;
  outfit: string;
  voice: string;
  voiceName?: string;
  gender: 'female' | 'male';
}

interface StoryboardScene {
  id: string;
  sceneNumber: number;
  title: string;
  shotType: string;
  prompt: string;
  duration: number;
  status: 'idle' | 'rendering' | 'done' | 'error';
  videoUrl?: string;
  imageUrl?: string;
  imageStatus?: 'idle' | 'rendering' | 'done' | 'error';
  error?: string;
  charactersPresent?: string[];
  dialogue?: string;
  speaker?: string;
  voice?: string;
  audioUrl?: string;
}

const PRESET_PROMPTS = [
  {
    label: 'Cine Drone Volcán',
    prompt: 'Cinematic drone shot flying over a majestic smoking volcano at sunset, dynamic lighting, 8k realism, photorealistic atmospheric haze',
    mode: 'video' as const,
  },
  {
    label: 'Cyberpunk Neon Rain',
    prompt: 'Slow camera pan of a futuristic Tokyo alley under heavy rain, reflection in puddles, glowing holographic neon signs, moody cyberpunk atmosphere',
    mode: 'video' as const,
  },
  {
    label: 'Ruptura Cinemática (60s)',
    prompt: 'Generate a 1-minute cinematic hyper-realistic short film about a breakup, shot on a 35mm lens with a cold, desaturated color palette of blues and grays, lit by a cloudy sunset. Maintain a slow, uninterrupted camera pan from left to right across the entire video, with cuts feeling like the camera passes through walls while keeping consistent rain shadow textures. The sequence starts with an extreme close-up of two intertwined hands on a dark wooden table; the top hand slowly lets go and slides away. The camera pans right to reveal two steaming cups of coffee and keys on the table, as a defocused figure in the background grabs a coat and exits the frame. Continuing right, the living room appears in semi-darkness with a single open cardboard box holding a face-down picture frame on the floor. Cut to a low-angle shot at floor level: shoes slowly walk toward the front door, opening it to let cold grayish light flood the dim wooden floor. From outside the apartment, the wooden door slowly shuts. Finally, the camera stops in the initial living room, now immensely empty, with only the reflection of rain on the wall moving, before slowly fading to black.',
    mode: 'movie' as const,
  },
  {
    label: 'Telenovela "La Herencia" (48s)',
    prompt: 'Create a 48-second cinematic Spanish-language telenovela, divided into 6 consecutive scenes of 8 seconds each. The entire story must feel like a real television drama, with photorealistic actors, natural facial expressions, emotional performances, realistic dialogue in Latin American Spanish, dramatic lighting, and professional cinematic camera work. TITLE: "LA HERENCIA DE LA TRAICIÓN" CHARACTER CONSISTENCY: Maintain exactly the same faces, clothing, hairstyles, ages throughout all scenes. Main characters: Valentina, a beautiful 28-year-old woman in an elegant red dress; Alejandro, a wealthy 35-year-old businessman in a black suit; and Isabel, Alejandro\'s 55-year-old mother in a black dress.',
    mode: 'movie' as const,
  },
  {
    label: 'Villa Minimalista',
    prompt: 'Modern architectural concrete luxury villa in Mallorca overlooking the ocean during golden hour, infinity pool, warm minimal interior lighting',
    mode: 'image' as const,
  },
  {
    label: 'Macro Escultura Cristal',
    prompt: 'Macro extreme close-up of a geometric bismuth crystal sculpture with iridescent rainbow refractions on a dark obsidian base',
    mode: 'image' as const,
  },
];

const SPANISH_VOICES = [
  { id: 'es-CO-SalomeNeural', name: 'Salomé (Colombia - Emotiva)' },
  { id: 'es-CO-GonzaloNeural', name: 'Gonzalo (Colombia - Firme)' },
  { id: 'es-MX-DaliaNeural', name: 'Dalia (México - Clara)' },
  { id: 'es-MX-JorgeNeural', name: 'Jorge (México - Profundo)' },
  { id: 'es-ES-ElviraNeural', name: 'Elvira (España - Madura/Dramática)' },
  { id: 'es-ES-AlvaroNeural', name: 'Álvaro (España - Intenso)' },
];

export default function FlowStudioPro() {
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<'video' | 'movie' | 'image'>('movie');
  const [aspect, setAspect] = useState('9:16');
  const [model, setModel] = useState('veo-quality');
  const [duration, setDuration] = useState('8');
  
  // Movie / Long Video Storyboard Mode
  const [targetDuration, setTargetDuration] = useState('48');
  const [storyboardScenes, setStoryboardScenes] = useState<StoryboardScene[]>([]);
  const [isGeneratingStoryboard, setIsGeneratingStoryboard] = useState(false);
  const [isRenderingMovie, setIsRenderingMovie] = useState(false);
  const [currentSceneIndex, setCurrentSceneIndex] = useState<number | null>(null);
  const [movieProgressMessage, setMovieProgressMessage] = useState<string | null>(null);
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null);
  const [editingPromptText, setEditingPromptText] = useState('');
  const [isMergingPartial, setIsMergingPartial] = useState(false);
  const [isGeneratingAllImages, setIsGeneratingAllImages] = useState(false);

  // Character Consistency & Neural Voice Studio
  const [characters, setCharacters] = useState<CharacterItem[]>([]);
  const [showCharacterPanel, setShowCharacterPanel] = useState(true);
  const [editingCharacterId, setEditingCharacterId] = useState<string | null>(null);
  const [isAdjustingPrompts, setIsAdjustingPrompts] = useState(false);
  const [generatingVoiceSceneId, setGeneratingVoiceSceneId] = useState<string | null>(null);

  // Google Vids Connector
  const [isExportingVids, setIsExportingVids] = useState(false);
  const [vidsModalData, setVidsModalData] = useState<{
    prompt: string;
    folder: string;
    count: number;
  } | null>(null);

interface AppUser {
  id: string;
  email: string;
  name: string;
  hasPaid: boolean;
  paidAt?: number;
  paidAmount?: number;
  planName?: string;
  minutes: number;
  role: 'admin' | 'user';
}

  // Pay-Per-Minute System (Hey Milo)
  const [userMinutes, setUserMinutes] = useState<number>(15.0);
  const [showPricingModal, setShowPricingModal] = useState(false);

  // User Authentication & $5 Access Pass System
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);
  const [showUserAuthModal, setShowUserAuthModal] = useState(false);
  const [userAuthMode, setUserAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Paywall ($5 USD Creator Access Pass)
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [payCardNumber, setPayCardNumber] = useState('');
  const [payCardExpiry, setPayCardExpiry] = useState('');
  const [payCardCvc, setPayCardCvc] = useState('');
  const [payCardName, setPayCardName] = useState('');
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentSuccessData, setPaymentSuccessData] = useState<any>(null);

  // Playback Canvas Size Controls (compact, normal, large)
  const [canvasSize, setCanvasSize] = useState<'compact' | 'normal' | 'large'>('compact');

  const fetchCurrentUser = async () => {
    try {
      setCheckingUser(true);
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.authenticated && data.user) {
        setCurrentUser(data.user);
        setUserMinutes(data.user.minutes ?? 0);
      } else {
        setCurrentUser(null);
      }
    } catch {
      setCurrentUser(null);
    } finally {
      setCheckingUser(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const handleUserLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setCurrentUser(null);
      setUserMinutes(0);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUserAuthSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthError(null);
    setAuthSubmitting(true);
    try {
      const endpoint = userAuthMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const bodyPayload =
        userAuthMode === 'login'
          ? { email: authEmail, password: authPassword }
          : { email: authEmail, password: authPassword, name: authName };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al autenticar');
      }

      setCurrentUser(data.user);
      setUserMinutes(data.user.minutes ?? 0);
      setShowUserAuthModal(false);
      setAuthPassword('');

      if (!data.user.hasPaid && data.user.role !== 'admin') {
        setShowPaywallModal(true);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Error en la autenticación');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleFastLogin = async (email = 'admin@heymilo.ai', password = 'admin123') => {
    setAuthEmail(email);
    setAuthPassword(password);
    setAuthError(null);
    setAuthSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Credenciales incorrectas');
      setCurrentUser(data.user);
      setUserMinutes(data.user.minutes ?? 999);
      setShowUserAuthModal(false);
      setAuthPassword('');
    } catch (err: any) {
      setAuthError(err.message || 'Error en inicio rápido');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleProcessPayment = async (packageType = 'creator_pass') => {
    if (!currentUser) {
      setShowPaywallModal(false);
      setShowUserAuthModal(true);
      setUserAuthMode('login');
      return;
    }

    setPaymentProcessing(true);
    setError(null);
    try {
      const res = await fetch('/api/payment/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageType,
          cardNumber: payCardNumber || '4242 4242 4242 4242',
          cardExpiry: payCardExpiry || '12/28',
          cardCvc: payCardCvc || '123',
          cardName: payCardName || currentUser.name,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al procesar el pago');

      setCurrentUser(data.user);
      setUserMinutes(data.user.minutes ?? 15);
      setPaymentSuccessData(data.receipt || { plan: 'Pase Creador ($5 USD)' });

      setTimeout(() => {
        setPaymentSuccessData(null);
        setShowPaywallModal(false);
        setShowPricingModal(false);
      }, 2500);
    } catch (err: any) {
      setError(`Error de pago: ${err.message}`);
    } finally {
      setPaymentProcessing(false);
    }
  };

  const deductMinutes = (minutesToDeduct: number) => {
    setUserMinutes((prev) => Math.max(0, Number((prev - minutesToDeduct).toFixed(2))));
  };

  const addMinutes = (minutesToAdd: number) => {
    setUserMinutes((prev) => Number((prev + minutesToAdd).toFixed(2)));
  };

  const [loading, setLoading] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [activeMedia, setActiveMedia] = useState<{
    url: string;
    type: 'video' | 'image';
    prompt?: string;
  } | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [copied, setCopied] = useState(false);

  // Gallery
  const [recentRenders, setRecentRenders] = useState<RenderItem[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(false);

  // Auth Status & Flow
  const [authStatus, setAuthStatus] = useState<{
    authenticated: boolean;
    isUnauthenticated?: boolean;
    message?: string;
  } | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authActionLoading, setAuthActionLoading] = useState(false);
  const [loginStep, setLoginStep] = useState<'idle' | 'browser_open' | 'success' | 'error'>('idle');
  const [loginFeedback, setLoginFeedback] = useState<string | null>(null);
  const [selectedBrowser, setSelectedBrowser] = useState<'chrome' | 'auto'>('chrome');

  const videoRef = useRef<HTMLVideoElement>(null);

  // Timer for generation
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (loading || isRenderingMovie) {
      setElapsedTime(0);
      timer = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [loading, isRenderingMovie]);

  // Check auth status
  const checkAuth = async (silent = false) => {
    if (!silent) setCheckingAuth(true);
    try {
      const res = await fetch('/api/flow/auth');
      const data = await res.json();
      setAuthStatus(data);
      return data;
    } catch {
      setAuthStatus({
        authenticated: false,
        message: 'No se pudo conectar al endpoint local de Flow',
      });
      return { authenticated: false };
    } finally {
      if (!silent) setCheckingAuth(false);
    }
  };

  // Polling auth state automatically when browser is open
  useEffect(() => {
    let pollTimer: NodeJS.Timeout;
    if (showAuthModal && loginStep === 'browser_open') {
      pollTimer = setInterval(async () => {
        try {
          const res = await fetch('/api/flow/auth');
          const data = await res.json();
          if (data.authenticated) {
            setAuthStatus(data);
            setLoginStep('success');
            setLoginFeedback('¡Sesión conectada con éxito! Tu cuenta ya está lista.');
            setTimeout(() => {
              setShowAuthModal(false);
              setLoginStep('idle');
            }, 2200);
          }
        } catch {
          // ignore transient errors during polling
        }
      }, 3000);
    }
    return () => clearInterval(pollTimer);
  }, [showAuthModal, loginStep]);

  // Trigger interactive browser login from UI
  const handleStartLogin = async () => {
    setAuthActionLoading(true);
    setLoginFeedback('Abriendo Brave para iniciar sesión...');
    setLoginStep('browser_open');
    try {
      const res = await fetch('/api/flow/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', browser: selectedBrowser }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al iniciar el proceso');
      }
      setLoginFeedback('Ventana de Brave abierta. Inicia sesión en Google y espera que cargue Flow.');
    } catch (e: any) {
      setLoginStep('error');
      setLoginFeedback(e.message || 'Error al iniciar el navegador');
    } finally {
      setAuthActionLoading(false);
    }
  };

  // Logout / clear session
  const handleLogout = async () => {
    if (!confirm('¿Deseas cerrar la sesión guardada de Google Flow?')) return;
    setAuthActionLoading(true);
    try {
      await fetch('/api/flow/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
      await checkAuth();
      setLoginStep('idle');
      setLoginFeedback('Sesión eliminada. Puedes conectar otra cuenta cuando quieras.');
    } catch (e: any) {
      alert('Error al cerrar sesión: ' + e.message);
    } finally {
      setAuthActionLoading(false);
    }
  };

  // Renew session headlessly
  const handleRenew = async () => {
    setAuthActionLoading(true);
    setLoginFeedback('Renovando token de sesión en segundo plano...');
    try {
      const res = await fetch('/api/flow/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'renew' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al renovar sesión');
      await checkAuth();
      setLoginFeedback('Sesión renovada con éxito.');
    } catch (e: any) {
      setLoginFeedback('Error al renovar: ' + e.message);
    } finally {
      setAuthActionLoading(false);
    }
  };

  // Load gallery
  const loadGallery = async () => {
    setLoadingGallery(true);
    try {
      const res = await fetch('/api/renders');
      const data = await res.json();
      if (data.renders) {
        setRecentRenders(data.renders);
        if (!activeMedia && data.renders.length > 0) {
          setActiveMedia({
            url: data.renders[0].url,
            type: data.renders[0].type,
          });
        }
      }
    } catch (e) {
      console.error('Error fetching gallery:', e);
    } finally {
      setLoadingGallery(false);
    }
  };

  useEffect(() => {
    checkAuth();
    loadGallery();
    // Default prompt for movie mode
    setPrompt(PRESET_PROMPTS[2].prompt);
  }, []);

  // Update default model when switching mode
  const handleModeChange = (newMode: 'video' | 'movie' | 'image') => {
    setMode(newMode);
    if (newMode === 'video' || newMode === 'movie') {
      setModel('veo-quality');
      if (aspect === '1:1' || aspect === '4:3' || aspect === '3:4') {
        setAspect('9:16');
      }
    } else {
      setModel('nano2');
    }
  };

  const checkAccessOrPrompt = (): boolean => {
    if (!currentUser) {
      setShowUserAuthModal(true);
      setUserAuthMode('login');
      setError('Debes iniciar sesión con tu cuenta para usar Hey Milo.');
      return false;
    }
    if (!currentUser.hasPaid && currentUser.role !== 'admin') {
      setShowPaywallModal(true);
      setError('Se requiere el Pase Creador de $5 USD para usar Hey Milo AI.');
      return false;
    }
    return true;
  };

  // Step 1: Break down user's story or script into scenes
  const handleGenerateStoryboard = async () => {
    if (!prompt.trim() || isGeneratingStoryboard) return;
    if (!checkAccessOrPrompt()) return;
    setIsGeneratingStoryboard(true);
    setError(null);
    try {
      const res = await fetch('/api/storyboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script: prompt.trim(),
          targetDuration: Number(targetDuration),
          aspect,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo desglosar el guion');

      if (data.characters && Array.isArray(data.characters)) {
        setCharacters(data.characters);
      }

      const formattedScenes: StoryboardScene[] = data.scenes.map((s: any) => ({
        ...s,
        status: 'idle',
      }));

      setStoryboardScenes(formattedScenes);
    } catch (err: any) {
      setError(err.message || 'Error al generar el storyboard');
    } finally {
      setIsGeneratingStoryboard(false);
    }
  };

  // Sync changes in character faces or wardrobe to all scene prompts
  const handleSyncCharactersToPrompts = async () => {
    if (storyboardScenes.length === 0 || characters.length === 0) return;
    setIsAdjustingPrompts(true);
    setError(null);
    try {
      const res = await fetch('/api/storyboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'adjust_prompts',
          characters,
          scenes: storyboardScenes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al ajustar prompts');
      setStoryboardScenes(data.scenes);
    } catch (err: any) {
      setError(err.message || 'Error al sincronizar personajes con los prompts');
    } finally {
      setIsAdjustingPrompts(false);
    }
  };

  // Update a single character's face, outfit or voice
  const handleUpdateCharacter = (charId: string, updates: Partial<CharacterItem>) => {
    setCharacters((prev) =>
      prev.map((c) => (c.id === charId ? { ...c, ...updates } : c))
    );
  };

  // Generate neural voice for a scene's spoken dialogue
  const handleGenerateSceneVoice = async (sceneIndex: number) => {
    const scene = storyboardScenes[sceneIndex];
    if (!scene || !scene.dialogue) return;
    setGeneratingVoiceSceneId(scene.id);
    setError(null);
    try {
      const res = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: scene.dialogue,
          voice: scene.voice || 'es-CO-SalomeNeural',
          sceneId: scene.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al sintetizar voz');

      const updated = [...storyboardScenes];
      updated[sceneIndex].audioUrl = data.audioUrl;

      // If video is already rendered, attach the audio to the video file with FFmpeg!
      if (updated[sceneIndex].videoUrl) {
        const videoFileName = updated[sceneIndex].videoUrl!.split('/').pop()!;
        const attachRes = await fetch('/api/movie/voice-attach', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoFileName,
            audioFileName: data.fileName,
          }),
        });
        const attachData = await attachRes.json();
        if (attachRes.ok && attachData.outputUrl) {
          updated[sceneIndex].videoUrl = attachData.outputUrl;
          setActiveMedia({
            url: attachData.outputUrl,
            type: 'video',
            prompt: `Toma ${sceneIndex + 1} con Voz: "${scene.speaker || 'Personaje'}"`,
          });
        }
      }

      setStoryboardScenes(updated);
      loadGallery();
    } catch (err: any) {
      setError(err.message || 'Error al generar la voz del personaje');
    } finally {
      setGeneratingVoiceSceneId(null);
    }
  };

  // Export current movie project to Google Vids package and open vids.google.com
  const handleExportToGoogleVids = async () => {
    if (storyboardScenes.length === 0) {
      setError('Desglosa o genera un Storyboard primero antes de exportar a Google Vids.');
      return;
    }
    setIsExportingVids(true);
    setError(null);
    try {
      const res = await fetch('/api/vids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: prompt.slice(0, 25) || 'Película FlowStudio',
          scenes: storyboardScenes,
          characters,
          fullScript: prompt,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al exportar a Google Vids');

      if (data.vidsPrompt) {
        try {
          await navigator.clipboard.writeText(data.vidsPrompt);
        } catch {
          // ignore clipboard permission error
        }
      }

      setVidsModalData({
        prompt: data.vidsPrompt,
        folder: data.exportFolder,
        count: data.exportedClipsCount,
      });
    } catch (err: any) {
      setError(err.message || 'Error al conectar con Google Vids');
    } finally {
      setIsExportingVids(false);
    }
  };

  // Step 2a: Generate a keyframe static photo for a single scene with character face anchoring
  const handleGenerateSceneImage = async (sceneIndex: number) => {
    const scene = storyboardScenes[sceneIndex];
    if (!scene) return;
    if (!checkAccessOrPrompt()) return;

    if (!authStatus?.authenticated) {
      setShowAuthModal(true);
      setError('Debes iniciar sesión con Google Flow para generar la foto clave.');
      return;
    }

    const updated = [...storyboardScenes];
    updated[sceneIndex].imageStatus = 'rendering';
    setStoryboardScenes(updated);
    setError(null);

    try {
      const payload: Record<string, any> = {
        prompt: `${scene.prompt}, continuous identical facial features and exact attire, highly detailed cinematic masterpiece, photorealistic, sharp focus, 8k`,
        mode: 'image',
        aspect,
        model: 'nano2',
      };

      const res = await fetch('/api/flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al generar la foto clave');

      const finalScenes = [...storyboardScenes];
      finalScenes[sceneIndex].imageUrl = data.url;
      finalScenes[sceneIndex].imageStatus = 'done';
      setStoryboardScenes(finalScenes);
      loadGallery();

      setActiveMedia({
        url: data.url,
        type: 'image',
        prompt: `Foto Clave Toma ${sceneIndex + 1}: ${scene.title}`,
      });
      deductMinutes(0.05);
    } catch (err: any) {
      const finalScenes = [...storyboardScenes];
      finalScenes[sceneIndex].imageStatus = 'error';
      setStoryboardScenes(finalScenes);
      setError(`Error al generar foto en Toma ${sceneIndex + 1}: ${err.message}`);
    }
  };

  // Step 2b: Generate keyframe static photos for all scenes
  const handleGenerateAllSceneImages = async () => {
    if (isGeneratingAllImages || storyboardScenes.length === 0) return;
    if (!checkAccessOrPrompt()) return;

    if (!authStatus?.authenticated) {
      setShowAuthModal(true);
      setError('Debes iniciar sesión con Google Flow antes de generar las fotos clave.');
      return;
    }

    setIsGeneratingAllImages(true);
    setError(null);
    const updated = [...storyboardScenes];

    try {
      for (let i = 0; i < updated.length; i++) {
        if (updated[i].imageUrl && updated[i].imageStatus === 'done') continue;

        updated[i].imageStatus = 'rendering';
        setStoryboardScenes([...updated]);
        setMovieProgressMessage(`Milo: Generando foto clave fija para toma ${i + 1} de ${updated.length}...`);

        const payload: Record<string, any> = {
          prompt: `${updated[i].prompt}, continuous identical facial features and exact attire, highly detailed cinematic masterpiece, photorealistic, sharp focus, 8k`,
          mode: 'image',
          aspect,
          model: 'nano2',
        };

        const res = await fetch('/api/flow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (res.ok && data.url) {
          updated[i].imageUrl = data.url;
          updated[i].imageStatus = 'done';
          deductMinutes(0.05);
        } else {
          updated[i].imageStatus = 'error';
        }
        setStoryboardScenes([...updated]);
      }
      loadGallery();
      setMovieProgressMessage('¡Fotos clave de todas las escenas listas! Ahora puedes animarlas con Veo 3.1.');
    } catch (err: any) {
      setError(`Error generando fotos clave: ${err.message}`);
    } finally {
      setIsGeneratingAllImages(false);
    }
  };

  // Step 2c: Render individual scene or animate its keyframe image (I2V)
  const handleRenderSingleScene = async (sceneIndex: number) => {
    if (isRenderingMovie) return;
    const scene = storyboardScenes[sceneIndex];
    if (!scene) return;
    if (!checkAccessOrPrompt()) return;

    if (!authStatus?.authenticated) {
      setShowAuthModal(true);
      setError('Debes iniciar sesión con Google Flow antes de renderizar la toma.');
      return;
    }

    const updated = [...storyboardScenes];
    updated[sceneIndex].status = 'rendering';
    updated[sceneIndex].error = undefined;
    setStoryboardScenes(updated);
    setError(null);

    try {
      const payload: Record<string, any> = {
        prompt: scene.prompt,
        mode: 'video',
        aspect,
        model,
        duration: scene.duration || 8,
      };

      if (scene.imageUrl) {
        payload.initialFrame = scene.imageUrl;
      }

      const res = await fetch('/api/flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.details || 'Error al renderizar toma');
      }

      const finalScenes = [...storyboardScenes];
      finalScenes[sceneIndex].status = 'done';
      finalScenes[sceneIndex].videoUrl = data.url;
      finalScenes[sceneIndex].error = undefined;
      setStoryboardScenes(finalScenes);
      loadGallery();

      // Deduct minutes
      deductMinutes((scene.duration || 8) / 60);

      // Set as active video on canvas
      setActiveMedia({
        url: data.url,
        type: 'video',
        prompt: `Toma ${sceneIndex + 1}: ${scene.title}`,
      });
    } catch (err: any) {
      const finalScenes = [...storyboardScenes];
      finalScenes[sceneIndex].status = 'error';
      finalScenes[sceneIndex].error = err.message || 'Error en la toma';
      setStoryboardScenes(finalScenes);
      setError(`Error en Toma ${sceneIndex + 1}: ${err.message}`);
    }
  };

  // Step 3: 100% Autonomous Agent Mode: Auto-Script + Auto-Characters + Auto-Voices + Veo Render + FFmpeg Assembly
  const handleRenderMovie = async () => {
    if (!checkAccessOrPrompt()) return;
    let currentScenes = storyboardScenes;
    if (currentScenes.length === 0) {
      setIsGeneratingStoryboard(true);
      setMovieProgressMessage('Agente IA: Analizando guion y extrayendo personajes consistentes...');
      try {
        const res = await fetch('/api/storyboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            script: prompt.trim(),
            targetDuration: Number(targetDuration),
            aspect,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'No se pudo desglosar el guion');
        if (data.characters) setCharacters(data.characters);
        currentScenes = data.scenes.map((s: any) => ({ ...s, status: 'idle' }));
        setStoryboardScenes(currentScenes);
      } catch (err: any) {
        setError(err.message || 'Error en fase inicial del agente');
        setIsGeneratingStoryboard(false);
        return;
      } finally {
        setIsGeneratingStoryboard(false);
      }
    }

    if (isRenderingMovie || currentScenes.length === 0) return;

    if (userMinutes < 0.1) {
      setError(`Saldo de Milo insuficiente (${userMinutes.toFixed(1)} min restantes). Recarga minutos para que Milo empiece la producción.`);
      setShowPricingModal(true);
      return;
    }

    if (!authStatus?.authenticated) {
      setShowAuthModal(true);
      setError('Debes iniciar sesión con Google Flow antes de que Milo comience la producción.');
      return;
    }

    setIsRenderingMovie(true);
    setError(null);
    const updatedScenes = [...currentScenes];
    const generatedClips: string[] = [];

    try {
      for (let i = 0; i < updatedScenes.length; i++) {
        setCurrentSceneIndex(i);

        // 1. Auto-Voice: Synthesize spoken dialogue if present and not yet generated
        let audioFileName: string | undefined;
        if (updatedScenes[i].dialogue && !updatedScenes[i].audioUrl) {
          setMovieProgressMessage(`Milo: Grabando voz de "${updatedScenes[i].speaker || 'Personaje'}" para toma ${i + 1}...`);
          try {
            const voiceRes = await fetch('/api/voice', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text: updatedScenes[i].dialogue,
                voice: updatedScenes[i].voice || 'es-CO-SalomeNeural',
                sceneId: updatedScenes[i].id,
              }),
            });
            const voiceData = await voiceRes.json();
            if (voiceRes.ok && voiceData.audioUrl) {
              updatedScenes[i].audioUrl = voiceData.audioUrl;
              audioFileName = voiceData.fileName;
              setStoryboardScenes([...updatedScenes]);
            }
          } catch (voiceErr) {
            console.warn('Voice synthesis warning:', voiceErr);
          }
        }

        // 2. Auto-Render Veo: SKIP already finished scenes to save tokens!
        let clipFileName: string;
        if (updatedScenes[i].status === 'done' && updatedScenes[i].videoUrl) {
          clipFileName = updatedScenes[i].videoUrl!.split('/').pop()!;
        } else {
          updatedScenes[i].status = 'rendering';
          setStoryboardScenes([...updatedScenes]);
          setMovieProgressMessage(`Milo: Rodando toma cinematográfica ${i + 1} de ${updatedScenes.length} con Veo 3.1...`);

          const payload: Record<string, any> = {
            prompt: updatedScenes[i].prompt,
            mode: 'video',
            aspect,
            model,
            duration: updatedScenes[i].duration || 8,
          };

          if (updatedScenes[i].imageUrl) {
            payload.initialFrame = updatedScenes[i].imageUrl;
            setMovieProgressMessage(`Milo: Animando foto clave de toma ${i + 1} con Veo 3.1 (I2V consistencia)...`);
          }

          const res = await fetch('/api/flow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          const data = await res.json();
          if (!res.ok) {
            updatedScenes[i].status = 'error';
            updatedScenes[i].error = data.error || 'Fallo al renderizar escena';
            setStoryboardScenes([...updatedScenes]);
            throw new Error(`Se detuvo en toma ${i + 1}: ${data.error || 'Error'}. Las tomas anteriores están a salvo.`);
          }

          clipFileName = data.fileName;
          updatedScenes[i].status = 'done';
          updatedScenes[i].videoUrl = data.url;
          // Deduct minutes consumed for this scene
          deductMinutes((updatedScenes[i].duration || 8) / 60);
        }

        // 3. Auto-Mix: If scene has voice audio, attach dialogue to video clip using FFmpeg
        const audioSrc = audioFileName || (updatedScenes[i].audioUrl ? updatedScenes[i].audioUrl!.split('/').pop()! : undefined);
        if (audioSrc) {
          try {
            setMovieProgressMessage(`Milo: Sincronizando voz y efectos en la toma ${i + 1}...`);
            const attachRes = await fetch('/api/movie/voice-attach', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                videoFileName: clipFileName,
                audioFileName: audioSrc,
              }),
            });
            const attachData = await attachRes.json();
            if (attachRes.ok && attachData.fileName) {
              clipFileName = attachData.fileName;
              updatedScenes[i].videoUrl = attachData.outputUrl;
            }
          } catch (mixErr) {
            console.warn('Audio attach warning:', mixErr);
          }
        }

        generatedClips.push(clipFileName);
        setStoryboardScenes([...updatedScenes]);
      }

      // Step 4: Final Autonomous Assembly: Stitch all voiced clips with FFmpeg
      if (generatedClips.length > 0) {
        setMovieProgressMessage(`Milo: Ensamblando todas las ${generatedClips.length} tomas en el corte final...`);
        const mergeRes = await fetch('/api/movie/merge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clips: generatedClips,
            outputFileName: `pelicula_completa_${targetDuration}s_${Date.now()}.mp4`,
          }),
        });

        const mergeData = await mergeRes.json();
        if (!mergeRes.ok) {
          throw new Error(mergeData.error || 'Error al ensamblar película final');
        }

        setActiveMedia({
          url: mergeData.outputUrl,
          type: 'video',
          prompt: `Película Completa Ensamblada (${targetDuration}s): ${prompt.slice(0, 100)}...`,
        });

        setMovieProgressMessage('¡Producción completada por el Agente! Película lista para ver.');
        loadGallery();
      }
    } catch (err: any) {
      setError(err.message || 'Error durante la producción de la película');
    } finally {
      setIsRenderingMovie(false);
      setCurrentSceneIndex(null);
    }
  };

  // Merge any scenes that are currently marked as 'done'
  const handleMergeDoneScenes = async () => {
    const readyScenes = storyboardScenes.filter((s) => s.status === 'done' && s.videoUrl);
    if (readyScenes.length === 0) {
      setError('No hay tomas terminadas para unir. Renderiza al menos una toma o vincula las existentes.');
      return;
    }

    setIsMergingPartial(true);
    setError(null);
    try {
      const clips = readyScenes.map((s) => s.videoUrl!.split('/').pop()!);
      const mergeRes = await fetch('/api/movie/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clips,
          outputFileName: `pelicula_${clips.length}_tomas_${Date.now()}.mp4`,
        }),
      });

      const mergeData = await mergeRes.json();
      if (!mergeRes.ok) throw new Error(mergeData.error || 'Error al unir clips');

      setActiveMedia({
        url: mergeData.outputUrl,
        type: 'video',
        prompt: `Película ensamblada (${clips.length} tomas): ${prompt.slice(0, 80)}...`,
      });
      loadGallery();
    } catch (err: any) {
      setError(err.message || 'Error al unir tomas con FFmpeg');
    } finally {
      setIsMergingPartial(false);
    }
  };

  // Save edited prompt for a specific scene
  const handleSaveScenePrompt = (sceneId: string) => {
    setStoryboardScenes((prev) =>
      prev.map((s) => (s.id === sceneId ? { ...s, prompt: editingPromptText.trim() } : s))
    );
    setEditingSceneId(null);
  };

  // Auto-link existing clips and keyframe images from public/renders into the storyboard
  const handleAutoLinkClips = () => {
    const videoFiles = recentRenders
      .filter((r) => r.type === 'video' && !r.fileName.startsWith('movie_') && !r.fileName.startsWith('pelicula_') && !r.fileName.startsWith('telenovela_'))
      .sort((a, b) => a.createdAt - b.createdAt);

    const imageFiles = recentRenders
      .filter((r) => r.type === 'image' && !r.fileName.includes('avatar'))
      .sort((a, b) => a.createdAt - b.createdAt);

    const updated = [...storyboardScenes];
    let linkedCount = 0;

    // Link keyframe images
    for (let i = 0; i < updated.length && i < imageFiles.length; i++) {
      if (!updated[i].imageUrl) {
        updated[i].imageUrl = imageFiles[i].url;
        updated[i].imageStatus = 'done';
        linkedCount++;
      }
    }

    // Link video clips
    for (let i = 0; i < updated.length && i < videoFiles.length; i++) {
      if (updated[i].status !== 'done') {
        updated[i].status = 'done';
        updated[i].videoUrl = videoFiles[i].url;
        updated[i].error = undefined;
        linkedCount++;
      }
    }

    setStoryboardScenes(updated);
    if (linkedCount > 0) {
      setError(null);
    } else {
      setError('No se encontraron nuevos archivos para vincular.');
    }
  };

  // Delete & Clear helpers for Storyboard and Prompt
  const handleDeleteScene = (sceneId: string) => {
    setStoryboardScenes((prev) => prev.filter((s) => s.id !== sceneId));
  };

  const handleClearStoryboard = () => {
    setStoryboardScenes([]);
    setCharacters([]);
  };

  const handleClearPrompt = () => {
    setPrompt('');
  };

  // Single shot generation
  const handleGenerate = async () => {
    if (!prompt.trim() || loading) return;
    if (!checkAccessOrPrompt()) return;

    const requiredMin = mode === 'video' ? Number(duration) / 60 : 0.05;
    if (userMinutes < requiredMin) {
      setError(`Saldo de Milo insuficiente: requieres ${requiredMin.toFixed(2)} min y te quedan ${userMinutes.toFixed(1)} min.`);
      setShowPricingModal(true);
      return;
    }

    if (!authStatus?.authenticated) {
      setShowAuthModal(true);
      setError('Debes iniciar sesión con tu cuenta de Google Flow antes de generar.');
      return;
    }

    setLoading(true);
    setError(null);
    setLogs(null);

    try {
      const payload: Record<string, any> = {
        prompt: prompt.trim(),
        mode,
        aspect,
        model,
      };

      if (mode === 'video') {
        payload.duration = Number(duration);
      }

      const res = await fetch('/api/flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.details || 'Error desconocido al generar');
      }

      setActiveMedia({
        url: data.url,
        type: mode === 'image' ? 'image' : 'video',
        prompt: prompt.trim(),
      });
      // Deduct minutes
      deductMinutes(requiredMin);

      if (data.logs) {
        setLogs(data.logs);
      }
      loadGallery();
    } catch (err: any) {
      setError(err.message || 'Error al conectar con Google Flow');
      if (err.details) {
        setLogs(err.details);
      }
    } finally {
      setLoading(false);
    }
  };

  const copyUrl = () => {
    if (!activeMedia) return;
    navigator.clipboard.writeText(window.location.origin + activeMedia.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-zinc-100 flex flex-col font-sans">
      {/* Top Navbar: Hey Milo */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/70 backdrop-blur-md sticky top-0 z-50 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden border border-indigo-500/30 shadow-lg shadow-indigo-500/20 relative group shrink-0">
            <img src="/milo-avatar.jpg" alt="Milo" className="w-full h-full object-cover" />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-zinc-950 shadow-[0_0_8px_#34d399]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white">Hey Milo</span>
              <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-300 border border-indigo-500/30">
                heymilo.ai
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">Tu Compañero & Director de Video con IA</p>
          </div>
        </div>

        {/* Minutes Balance + User Profile + Flow Status & Actions */}
        <div className="flex items-center gap-3">
          {/* User Account & $5 Pass Access Button */}
          {checkingUser ? (
            <span className="text-xs text-zinc-500 hidden sm:inline">Cargando...</span>
          ) : currentUser ? (
            <div className="flex items-center gap-2 bg-gradient-to-r from-zinc-900 to-zinc-950 border border-zinc-800/90 pl-2.5 pr-1.5 py-1 rounded-full shadow-inner">
              <div className="w-6 h-6 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-[11px] font-bold text-indigo-300">
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="text-left hidden md:block">
                <div className="text-[11px] font-bold text-zinc-200 leading-none truncate max-w-[120px]">
                  {currentUser.name || currentUser.email.split('@')[0]}
                </div>
                <div className="text-[9px] text-zinc-400 leading-tight">
                  {currentUser.role === 'admin' ? (
                    <span className="text-purple-400 font-bold">Admin Master</span>
                  ) : currentUser.hasPaid ? (
                    <span className="text-emerald-400 font-semibold">Pase $3 Activo</span>
                  ) : (
                    <span className="text-amber-400 font-semibold">Sin Pase ($3 USD)</span>
                  )}
                </div>
              </div>

              {/* Status / Pay $3 Button */}
              {!currentUser.hasPaid && currentUser.role !== 'admin' && (
                <button
                  type="button"
                  onClick={() => setShowPaywallModal(true)}
                  className="bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500 hover:from-amber-400 hover:to-rose-400 text-white font-black text-[10px] px-2.5 py-1 rounded-full shadow-md shadow-rose-500/20 transition animate-pulse flex items-center gap-1 cursor-pointer"
                  title="Paga $3 USD para desbloquear la plataforma de por vida"
                >
                  <Lock className="w-3 h-3 text-white" />
                  <span>Pagar $3</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleUserLogout}
                title="Cerrar sesión"
                className="p-1 rounded-full text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setUserAuthMode('login');
                  setAuthError(null);
                  setShowUserAuthModal(true);
                }}
                className="px-3 py-1.5 rounded-full text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition cursor-pointer"
              >
                Ingresar
              </button>
              <button
                type="button"
                onClick={() => {
                  setUserAuthMode('register');
                  setAuthError(null);
                  setShowUserAuthModal(true);
                }}
                className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-500 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/25 transition transform hover:scale-105 active:scale-95 flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>Registro ($3 USD)</span>
              </button>
            </div>
          )}

          {/* Minutes balance widget */}
          <div className="flex items-center gap-2 bg-gradient-to-r from-zinc-900 to-zinc-950 border border-zinc-800/90 pl-3 pr-1.5 py-1.5 rounded-full shadow-inner">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <div className="text-xs">
              <span className="text-zinc-400">Saldo: </span>
              <span className={`font-bold font-mono ${userMinutes > 2 ? 'text-indigo-300' : 'text-amber-400 animate-pulse'}`}>
                {userMinutes.toFixed(1)} min
              </span>
            </div>
            <button
              onClick={() => {
                if (!currentUser) {
                  setShowUserAuthModal(true);
                  return;
                }
                if (!currentUser.hasPaid && currentUser.role !== 'admin') {
                  setShowPaywallModal(true);
                  return;
                }
                setShowPricingModal(true);
              }}
              className="ml-1 text-[11px] font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-500 hover:from-indigo-500 hover:to-purple-500 text-white px-2.5 py-1 rounded-full shadow-md shadow-indigo-500/20 transition transform hover:scale-105 active:scale-95 flex items-center gap-1 cursor-pointer"
            >
              <Coins className="w-3 h-3 text-amber-300" />
              <span>+ Recargar</span>
            </button>
          </div>

          {checkingAuth ? (
            <span className="text-xs text-zinc-400 hidden lg:flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3.5 py-1.5 rounded-full">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
              Verificando puente...
            </span>
          ) : authStatus?.authenticated ? (
            <button
              onClick={() => {
                setLoginStep('idle');
                setShowAuthModal(true);
              }}
              className="hidden lg:flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-3.5 py-1.5 rounded-full text-emerald-400 text-xs font-semibold transition cursor-pointer shadow-sm hover:shadow-emerald-500/10"
              title="Cuenta conectada. Haz clic para gestionar o cambiar cuenta"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
              Google Flow Activo
              <span className="text-[10px] bg-emerald-500/20 px-1.5 py-0.5 rounded text-emerald-300 ml-1">Brave</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setLoginStep('idle');
                setShowAuthModal(true);
              }}
              className="hidden lg:flex items-center gap-2 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/40 px-3.5 py-1.5 rounded-full text-amber-300 text-xs font-bold transition cursor-pointer shadow-lg shadow-amber-500/10 hover:scale-105 active:scale-95 animate-pulse"
            >
              <LogIn className="w-3.5 h-3.5 text-amber-400" />
              Iniciar Sesión en Google Flow
            </button>
          )}

          <button
            onClick={() => {
              setShowUserAuthModal(true);
            }}
            title="¿Cómo funciona Hey Milo y requisitos de Google AI Pro?"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-indigo-300 text-xs font-semibold transition cursor-pointer"
          >
            <Info className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline">¿Cómo funciona Milo?</span>
          </button>

          <button
            onClick={() => {
              checkAuth();
              fetchCurrentUser();
              loadGallery();
            }}
            title="Recargar estado"
            className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Paywall Alert Banner for Unpaid / Guest Users */}
      {(!currentUser || (!currentUser.hasPaid && currentUser.role !== 'admin')) && (
        <div className="bg-gradient-to-r from-indigo-950/90 via-purple-950/80 to-zinc-950 border-b border-indigo-500/30 px-6 py-2.5 flex items-center justify-between gap-4 flex-wrap text-xs shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-amber-300 shrink-0">
              <Lock className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-bold text-white">Acceso a Hey Milo AI para Nuevos Usuarios: </span>
              <span className="text-zinc-300">
                Paga tu <strong>Pase Creador de $3 USD</strong> para desbloquear la plataforma con <strong>20 minutos reales de Google Veo 3.1 & Nano Pro</strong> incluidos.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!currentUser ? (
              <button
                type="button"
                onClick={() => {
                  setUserAuthMode('register');
                  setShowUserAuthModal(true);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold transition shadow cursor-pointer text-xs"
              >
                Crear Cuenta & Pagar $3 USD
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowPaywallModal(true)}
                className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-white font-bold transition shadow-lg shadow-rose-500/20 cursor-pointer text-xs animate-pulse flex items-center gap-1.5"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Pagar $3 USD & Desbloquear</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Studio Workspace */}
      <div className="flex-1 max-w-[1820px] w-full mx-auto p-4 md:p-6 lg:p-7 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Control Studio (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* Milo Interactive Status Banner */}
          <div className="bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-zinc-900/80 border border-indigo-500/20 rounded-2xl p-4 flex items-center justify-between shadow-xl backdrop-blur-md relative overflow-hidden">
            <div className="flex items-center gap-3.5 relative z-10">
              <div className="relative shrink-0">
                <img
                  src="/milo-avatar.jpg"
                  alt="Milo"
                  className="w-11 h-11 rounded-2xl object-cover border border-indigo-400/40 shadow-lg shadow-indigo-500/20"
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-zinc-950 shadow-[0_0_8px_#34d399] animate-pulse" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-white">Milo</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 px-1.5 py-0.5 rounded">
                    {loading || isRenderingMovie ? 'EN RODAJE' : 'EN EL SET'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-300 leading-tight">
                  {loading || isRenderingMovie
                    ? movieProgressMessage || `Milo está rodando tu video con Veo 3.1 (${elapsedTime}s)...`
                    : '«¡Hola! Cuéntame tu idea y yo me encargo de armar las tomas y la voz. Solo pagas los minutos que uses.»'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowPricingModal(true)}
              className="shrink-0 ml-3 text-[11px] font-semibold text-indigo-300 hover:text-white bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 shadow-sm"
              title="Haz clic para ver o recargar minutos"
            >
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>{userMinutes.toFixed(1)}m</span>
            </button>
          </div>

          {/* Main Card */}
          <div className="bg-zinc-900/60 border border-zinc-800/90 rounded-2xl p-5 shadow-2xl backdrop-blur-xl space-y-5">
            {/* Mode Selector Tabs (Individual Shot vs Long Movie vs Image) */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block mb-2">
                Modo de Producción
              </label>
              <div className="grid grid-cols-3 gap-1.5 bg-zinc-950/80 p-1.5 rounded-xl border border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => handleModeChange('movie')}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition ${
                    mode === 'movie'
                      ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 text-white shadow-lg shadow-purple-600/30'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                  }`}
                >
                  <Film className="w-3.5 h-3.5" />
                  Película (Largo)
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange('video')}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition ${
                    mode === 'video'
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  Toma Única (8s)
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange('image')}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition ${
                    mode === 'image'
                      ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-lg shadow-cyan-600/30'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  Imagen (Nano)
                </button>
              </div>
            </div>

            {/* Prompt / Script Input */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  {mode === 'movie' ? 'Guion o Historia Completa' : 'Prompt Creativo'}
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-zinc-500 font-mono">{prompt.length} car.</span>
                  {prompt.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearPrompt}
                      className="px-2 py-0.5 rounded bg-zinc-800/80 hover:bg-rose-950/40 border border-zinc-700/60 hover:border-rose-500/40 text-[10px] font-semibold text-zinc-400 hover:text-rose-300 transition flex items-center gap-1 cursor-pointer"
                      title="Borrar todo el texto del guion o prompt"
                    >
                      <Trash2 className="w-3 h-3 text-rose-400" />
                      <span>Limpiar</span>
                    </button>
                  )}
                </div>
              </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                  mode === 'movie'
                    ? 'Pega aquí tu historia completa, guion de escenas o diálogos. El Auto-Director desglosará cada toma secuencial y las unirá en un solo video final.'
                    : mode === 'video'
                    ? 'Ej: Vista aérea cinematográfica en 4K de un volcán activo al amanecer, tomas dinámicas de dron, hiperrealista...'
                    : 'Ej: Fotografía macro de una flor de cristal bioluminiscente con gotas de rocío que brillan en la oscuridad...'
                }
                rows={5}
                className="w-full bg-zinc-950/90 border border-zinc-800 rounded-xl p-3.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition resize-none leading-relaxed"
              />
            </div>

            {/* Presets */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block mb-2">
                Plantillas Rápidas
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PRESET_PROMPTS.filter((p) => p.mode === mode).map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setPrompt(preset.prompt)}
                    className="text-left p-2.5 rounded-xl bg-zinc-950/60 hover:bg-zinc-800/80 border border-zinc-800/70 hover:border-zinc-700 transition text-xs space-y-1 group"
                  >
                    <div className="font-semibold text-zinc-300 group-hover:text-indigo-400 flex items-center justify-between">
                      <span>{preset.label}</span>
                      <Sparkles className="w-3 h-3 opacity-0 group-hover:opacity-100 transition text-cyan-400" />
                    </div>
                    <p className="text-[11px] text-zinc-500 line-clamp-1 group-hover:text-zinc-400">
                      {preset.prompt}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Mode-Specific Options */}
            {mode === 'movie' ? (
              // Movie Configuration
              <div className="space-y-4 pt-1 border-t border-zinc-800/60">
                <div className="grid grid-cols-2 gap-3">
                  {/* Target Total Movie Duration */}
                  <div className="col-span-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-zinc-400">
                        Duración Total de la Película
                      </label>
                      <span className="text-[11px] font-mono text-purple-300 font-bold bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                        {(() => {
                          const sec = Math.min(480, Number(targetDuration) || 48);
                          const mins = Math.floor(sec / 60);
                          const s = sec % 60;
                          const tomas = Math.round(sec / 8);
                          if (mins > 0) return `${mins}m ${s > 0 ? `${s}s ` : ''}(${tomas} tomas de 8s • Máx 8m)`;
                          return `${sec} Segundos (${tomas} tomas de 8s)`;
                        })()}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-1.5 mb-2.5">
                      {[
                        { label: '24s', val: '24', tomas: '3 tomas', tag: 'Reel' },
                        { label: '48s', val: '48', tomas: '6 tomas', tag: 'Spot' },
                        { label: '1 Min', val: '60', tomas: '8 tomas', tag: 'Teaser' },
                        { label: '2 Min', val: '120', tomas: '15 tomas', tag: 'Trailer' },
                        { label: '3 Min', val: '180', tomas: '22 tomas', tag: 'Corto' },
                        { label: '4 Min', val: '240', tomas: '30 tomas', tag: 'Escena' },
                        { label: '5 Min', val: '300', tomas: '38 tomas', tag: 'Corto Pro' },
                        { label: '6 Min', val: '360', tomas: '45 tomas', tag: 'Serie' },
                        { label: '7 Min', val: '420', tomas: '52 tomas', tag: 'Episodio' },
                        { label: '8 Min', val: '480', tomas: '60 tomas', tag: 'Máx (8m)' },
                      ].map((item) => (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => setTargetDuration(item.val)}
                          className={`py-2 px-1 rounded-xl text-xs font-semibold border text-center transition cursor-pointer flex flex-col items-center justify-center ${
                            targetDuration === item.val
                              ? 'bg-gradient-to-b from-purple-600/40 to-indigo-600/30 border-purple-500 text-purple-200 shadow-md shadow-purple-600/20 font-bold'
                              : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                          }`}
                        >
                          <span className="block font-bold text-[11px] leading-tight">{item.label}</span>
                          <span className="text-[9px] text-zinc-500 block leading-tight">{item.tomas}</span>
                          <span className="text-[8px] text-indigo-400/80 font-mono mt-0.5">{item.tag}</span>
                        </button>
                      ))}
                    </div>

                    {/* Custom duration slider / manual input / quick bump buttons */}
                    <div className="flex flex-wrap items-center gap-2 bg-zinc-950/70 border border-zinc-800/80 px-3 py-2 rounded-xl text-xs">
                      <Clock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      <span className="text-zinc-400 text-[11px] shrink-0 font-medium">Ajuste Fino (Máx 8 Min):</span>
                      
                      <input
                        type="range"
                        min="16"
                        max="480"
                        step="8"
                        value={Math.min(480, Number(targetDuration) || 48)}
                        onChange={(e) => setTargetDuration(e.target.value)}
                        className="flex-1 min-w-[120px] accent-indigo-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                      />

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Quick increment buttons */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setTargetDuration((prev) => String(Math.max(16, Number(prev) - 60)))}
                            className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400 hover:text-white"
                            title="Restar 1 minuto (-60s)"
                          >
                            -1m
                          </button>
                          <button
                            type="button"
                            onClick={() => setTargetDuration((prev) => String(Math.min(480, Number(prev) + 30)))}
                            className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400 hover:text-white"
                            title="Sumar 30 segundos (+30s)"
                          >
                            +30s
                          </button>
                          <button
                            type="button"
                            onClick={() => setTargetDuration((prev) => String(Math.min(480, Number(prev) + 60)))}
                            className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] text-purple-300 hover:text-white"
                            title="Sumar 1 minuto (+60s)"
                          >
                            +1m
                          </button>
                          <button
                            type="button"
                            onClick={() => setTargetDuration((prev) => String(Math.min(480, Number(prev) + 120)))}
                            className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] text-indigo-300 hover:text-white"
                            title="Sumar 2 minutos (+120s)"
                          >
                            +2m
                          </button>
                          <button
                            type="button"
                            onClick={() => setTargetDuration('480')}
                            className="px-1.5 py-0.5 rounded bg-purple-950/60 border border-purple-500/40 text-[10px] text-purple-200 hover:text-white font-bold"
                            title="Ajustar al máximo permitido: 8 minutos (480s / 60 tomas)"
                          >
                            Máx (8m)
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="16"
                            max="480"
                            step="8"
                            value={Math.min(480, Number(targetDuration) || 48)}
                            onChange={(e) => {
                              const val = Math.min(480, Math.max(16, Number(e.target.value) || 16));
                              setTargetDuration(String(val));
                            }}
                            className="w-16 bg-zinc-900 border border-zinc-700/80 rounded-lg px-1.5 py-0.5 text-center text-[11px] font-mono text-zinc-200 focus:outline-none focus:border-indigo-500"
                          />
                          <span className="text-[10px] text-zinc-500">seg</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Aspect Ratio */}
                  <div>
                    <label className="text-xs font-semibold text-zinc-400 block mb-1.5">Formato</label>
                    <div className="relative">
                      <select
                        value={aspect}
                        onChange={(e) => setAspect(e.target.value)}
                        className="w-full appearance-none bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 transition"
                      >
                        <option value="9:16">9:16 (Vertical / TikTok / Shorts)</option>
                        <option value="16:9">16:9 (Horizontal / Cine YouTube)</option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-zinc-500 absolute right-3 top-2.5 pointer-events-none" />
                    </div>
                  </div>

                  {/* Quality Engine */}
                  <div>
                    <label className="text-xs font-semibold text-zinc-400 block mb-1.5">Motor Veo</label>
                    <div className="relative">
                      <select
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        className="w-full appearance-none bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 transition"
                      >
                        <option value="veo-quality">Veo Quality (Veo 3.1 Cine HD)</option>
                        <option value="veo-fast">Veo Fast (Rápido)</option>
                        <option value="omni-flash">Omni Flash</option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-zinc-500 absolute right-3 top-2.5 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Movie Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    type="button"
                    disabled={isGeneratingStoryboard || !prompt.trim()}
                    onClick={handleGenerateStoryboard}
                    className="py-3 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                  >
                    {isGeneratingStoryboard ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                    ) : (
                      <ListOrdered className="w-3.5 h-3.5 text-purple-400" />
                    )}
                    <span>Desglosar en Tomas</span>
                  </button>

                  <button
                    type="button"
                    disabled={isRenderingMovie || !prompt.trim()}
                    onClick={handleRenderMovie}
                    className="py-3 px-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-purple-600/30 transition hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {isRenderingMovie ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                    ) : (
                      <Film className="w-3.5 h-3.5 text-cyan-200" />
                    )}
                    <span>Generar Película Completa</span>
                  </button>
                </div>
              </div>
            ) : (
              // Single Shot Configuration
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-zinc-800/60">
                {/* Aspect Ratio */}
                <div>
                  <label className="text-xs font-semibold text-zinc-400 block mb-1.5">
                    Proporción (Aspect)
                  </label>
                  <div className="relative">
                    <select
                      value={aspect}
                      onChange={(e) => setAspect(e.target.value)}
                      className="w-full appearance-none bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 transition"
                    >
                      <option value="9:16">9:16 (Vertical / TikTok)</option>
                      <option value="16:9">16:9 (Horizontal / Cine)</option>
                      {mode === 'image' && (
                        <>
                          <option value="1:1">1:1 (Cuadrado / Instagram)</option>
                          <option value="4:3">4:3 (Estándar)</option>
                          <option value="3:4">3:4 (Retrato)</option>
                        </>
                      )}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-zinc-500 absolute right-3 top-2.5 pointer-events-none" />
                  </div>
                </div>

                {/* Model / Quality */}
                <div>
                  <label className="text-xs font-semibold text-zinc-400 block mb-1.5">
                    Motor de Render
                  </label>
                  <div className="relative">
                    <select
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="w-full appearance-none bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 transition"
                    >
                      {mode === 'video' ? (
                        <>
                          <option value="veo-quality">Veo Quality (Veo 3.1 Cine HD)</option>
                          <option value="veo-fast">Veo Fast (Ultra Rápido)</option>
                          <option value="omni-flash">Omni Flash</option>
                          <option value="veo-lite">Veo Lite</option>
                        </>
                      ) : (
                        <>
                          <option value="nano2">Nano Banana 2 (Estándar)</option>
                          <option value="nano-pro">Nano Pro HD</option>
                          <option value="imagen4">Imagen 4</option>
                        </>
                      )}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-zinc-500 absolute right-3 top-2.5 pointer-events-none" />
                  </div>
                </div>

                {/* Duration for single video */}
                {mode === 'video' && (
                  <div className="col-span-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-zinc-400">Duración de la Toma</label>
                      <span className="text-xs font-mono text-indigo-400">{duration} segundos</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setDuration('4')}
                        className={`py-1.5 rounded-lg text-xs font-semibold border transition ${
                          duration === '4'
                            ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        4s (Rápido)
                      </button>
                      <button
                        type="button"
                        onClick={() => setDuration('6')}
                        className={`py-1.5 rounded-lg text-xs font-semibold border transition ${
                          duration === '6'
                            ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        6s (Estándar)
                      </button>
                      <button
                        type="button"
                        onClick={() => setDuration('8')}
                        className={`py-1.5 rounded-lg text-xs font-semibold border transition ${
                          duration === '8'
                            ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        8s (Cine HD)
                      </button>
                    </div>
                  </div>
                )}

                {/* Single Submit Button */}
                <div className="col-span-2 pt-2">
                  <button
                    type="button"
                    disabled={loading || !prompt.trim()}
                    onClick={handleGenerate}
                    className={`w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 transition shadow-xl cursor-pointer ${
                      loading || !prompt.trim()
                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed shadow-none'
                        : 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white shadow-indigo-600/30 hover:scale-[1.01] active:scale-[0.99]'
                    }`}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Renderizando con Google Flow ({elapsedTime}s)...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-cyan-200" />
                        <span>Generar {mode === 'video' ? 'Toma' : 'Imagen'} en Alta Definición</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <div className="flex-1 space-y-1">
                  <p className="font-semibold">Error al generar render</p>
                  <p className="text-[11px] text-rose-400 leading-relaxed">{error}</p>
                  {!authStatus?.authenticated && (
                    <button
                      onClick={() => setShowAuthModal(true)}
                      className="mt-2 px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 rounded-lg text-[11px] font-bold text-rose-200 transition"
                    >
                      Iniciar sesión ahora →
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Movie Progress Card */}
            {isRenderingMovie && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/60 to-zinc-950 border border-purple-500/30 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-purple-300 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                    Producción de Película en Curso
                  </span>
                  <span className="font-mono text-cyan-400">{elapsedTime}s</span>
                </div>
                <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-zinc-800">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-cyan-400 h-full transition-all duration-500"
                    style={{
                      width: `${
                        currentSceneIndex !== null
                          ? Math.round(((currentSceneIndex + 1) / storyboardScenes.length) * 100)
                          : 10
                      }%`,
                    }}
                  />
                </div>
                <p className="text-xs text-zinc-300 italic">{movieProgressMessage}</p>
              </div>
            )}

            {/* Terminal logs toggle */}
            {logs && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowLogs(!showLogs)}
                  className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>{showLogs ? 'Ocultar consola de gflow' : 'Ver consola de gflow'}</span>
                </button>
                {showLogs && (
                  <pre className="mt-2 p-3 bg-black/90 border border-zinc-800 rounded-xl text-[10px] font-mono text-zinc-400 max-h-40 overflow-y-auto whitespace-pre-wrap">
                    {logs}
                  </pre>
                )}
              </div>
            )}
          </div>

          {/* Character Consistency & Neural Voice Studio (When in Movie Mode & Characters exist) */}
          {mode === 'movie' && characters.length > 0 && (
            <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-950 border border-purple-500/30 rounded-2xl p-4 shadow-2xl backdrop-blur-xl space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-zinc-100 flex items-center gap-2">
                      <span>Biblia de Personajes & Voces Neurales</span>
                      <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-[10px] text-purple-300 font-mono">
                        {characters.length} Actores
                      </span>
                    </h3>
                    <p className="text-[10px] text-zinc-400">
                      Rostros, vestuario y voces fijas para consistencia cinematográfica.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isAdjustingPrompts || storyboardScenes.length === 0}
                  onClick={handleSyncCharactersToPrompts}
                  title="Inyecta los rostros y vestimenta de estos personajes en todas las tomas"
                  className="px-2.5 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/50 text-purple-200 text-[11px] font-bold transition flex items-center gap-1.5 shadow-md shadow-purple-600/20"
                >
                  {isAdjustingPrompts ? (
                    <Loader2 className="w-3 h-3 animate-spin text-purple-300" />
                  ) : (
                    <Sparkles className="w-3 h-3 text-cyan-300" />
                  )}
                  <span>Sincronizar con Tomas</span>
                </button>
              </div>

              {/* Character Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {characters.map((char) => (
                  <div
                    key={char.id}
                    className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-2 hover:border-zinc-700 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white ${
                            char.gender === 'female'
                              ? 'bg-gradient-to-tr from-rose-500 to-purple-600'
                              : 'bg-gradient-to-tr from-indigo-500 to-cyan-600'
                          }`}
                        >
                          {char.name.charAt(0)}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-zinc-200 block leading-tight">{char.name}</span>
                          <span className="text-[10px] text-zinc-500">{char.role}</span>
                        </div>
                      </div>

                      {/* Voice selector */}
                      <div className="relative">
                        <select
                          value={char.voice}
                          onChange={(e) => handleUpdateCharacter(char.id, { voice: e.target.value })}
                          className="appearance-none bg-zinc-900 border border-zinc-800 hover:border-purple-500/50 rounded-lg px-2 py-1 pr-6 text-[10px] text-purple-300 focus:outline-none transition cursor-pointer"
                        >
                          {SPANISH_VOICES.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.name}
                            </option>
                          ))}
                        </select>
                        <Volume2 className="w-3 h-3 text-purple-400 absolute right-2 top-1.5 pointer-events-none" />
                      </div>
                    </div>

                    {/* Face & Wardrobe Anchors */}
                    <div className="space-y-1 text-[10px]">
                      <div className="bg-zinc-900/80 rounded p-1.5 border border-zinc-800/60">
                        <span className="text-zinc-500 block font-semibold mb-0.5">Rostro Fijo:</span>
                        <input
                          type="text"
                          value={char.faceAnchor}
                          onChange={(e) => handleUpdateCharacter(char.id, { faceAnchor: e.target.value })}
                          className="w-full bg-transparent text-zinc-300 focus:outline-none focus:text-white transition"
                        />
                      </div>
                      <div className="bg-zinc-900/80 rounded p-1.5 border border-zinc-800/60">
                        <span className="text-zinc-500 block font-semibold mb-0.5">Vestuario Fijo:</span>
                        <input
                          type="text"
                          value={char.outfit}
                          onChange={(e) => handleUpdateCharacter(char.id, { outfit: e.target.value })}
                          className="w-full bg-transparent text-zinc-300 focus:outline-none focus:text-white transition"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Storyboard Scene Breakdown Panel (When in Movie Mode) */}
          {mode === 'movie' && storyboardScenes.length > 0 && (
            <div className="bg-zinc-900/60 border border-zinc-800/90 rounded-2xl p-5 shadow-2xl backdrop-blur-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/70 pb-3">
                <div className="flex items-center gap-2">
                  <Clapperboard className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                    Storyboard ({storyboardScenes.length} Tomas • {(() => {
                      const sec = Number(targetDuration) || 48;
                      const hrs = Math.floor(sec / 3600);
                      const mins = Math.floor((sec % 3600) / 60);
                      const s = sec % 60;
                      if (hrs > 0) return `${hrs}h ${mins}m`;
                      if (mins > 0) return `${mins}m ${s > 0 ? `${s}s` : ''}`;
                      return `${sec}s`;
                    })()})
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Generate all keyframe images */}
                  <button
                    type="button"
                    disabled={isGeneratingAllImages || isRenderingMovie}
                    onClick={handleGenerateAllSceneImages}
                    title="Crea primero las fotos fijas de todas las escenas para congelar y revisar las caras antes de animar"
                    className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white text-[11px] font-bold shadow-md shadow-amber-600/30 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    {isGeneratingAllImages ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <ImageIcon className="w-3 h-3 text-amber-200" />
                    )}
                    <span>📸 Generar Fotos Clave (I2V)</span>
                  </button>

                  {/* Auto link existing clips */}
                  <button
                    type="button"
                    onClick={handleAutoLinkClips}
                    title="Vincular tomas ya renderizadas en disco para no volver a gastar tokens"
                    className="px-2.5 py-1 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-[11px] font-semibold text-zinc-300 transition flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3 h-3 text-cyan-400" />
                    <span>Vincular Guardadas</span>
                  </button>

                  {/* Partial merge ready clips */}
                  {storyboardScenes.some((s) => s.status === 'done' && s.videoUrl) && (
                    <button
                      type="button"
                      disabled={isMergingPartial}
                      onClick={handleMergeDoneScenes}
                      className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-[11px] font-bold shadow-md shadow-emerald-600/30 transition flex items-center gap-1.5"
                    >
                      {isMergingPartial ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Combine className="w-3 h-3 text-emerald-100" />
                      )}
                      <span>
                        Unir Listas ({storyboardScenes.filter((s) => s.status === 'done' && s.videoUrl).length})
                      </span>
                    </button>
                  )}

                  {/* Export & Launch Google Vids */}
                  <button
                    type="button"
                    disabled={isExportingVids}
                    onClick={handleExportToGoogleVids}
                    title="Exporta el proyecto y abre Google Vids con guion y metraje listo"
                    className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-[11px] font-bold shadow-md shadow-blue-600/30 transition flex items-center gap-1.5"
                  >
                    {isExportingVids ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3 text-yellow-300" />
                    )}
                    <span>Abrir en Google Vids</span>
                  </button>

                  {/* Clear All Storyboard Scenes */}
                  <button
                    type="button"
                    onClick={handleClearStoryboard}
                    title="Borrar todas las tomas del Storyboard"
                    className="px-2 py-1 rounded-lg bg-zinc-800/80 hover:bg-rose-950/40 border border-zinc-700/60 hover:border-rose-500/40 text-[11px] font-semibold text-zinc-400 hover:text-rose-300 transition flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3 text-rose-400" />
                    <span>Borrar Storyboard</span>
                  </button>
                </div>
              </div>

              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {storyboardScenes.map((scene, idx) => (
                  <div
                    key={scene.id}
                    className={`p-3.5 rounded-xl border text-xs transition ${
                      scene.status === 'rendering'
                        ? 'bg-purple-950/40 border-purple-500/60 shadow-lg shadow-purple-500/20 ring-1 ring-purple-500/30'
                        : scene.status === 'done'
                        ? 'bg-emerald-950/20 border-emerald-500/40'
                        : scene.status === 'error'
                        ? 'bg-rose-950/25 border-rose-500/50'
                        : 'bg-zinc-950/80 border-zinc-800/80'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 font-semibold text-zinc-200">
                        <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-[10px] text-purple-300 font-mono font-bold">
                          Toma {idx + 1}
                        </span>
                        <span className="text-zinc-400 text-[11px]">{scene.shotType}</span>

                        {/* Character presence badges */}
                        {scene.charactersPresent && scene.charactersPresent.map((cName) => (
                          <span
                            key={cName}
                            className="px-1.5 py-0.2 rounded bg-indigo-500/10 border border-indigo-500/30 text-[9px] text-indigo-300 font-medium"
                          >
                            {cName}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-zinc-500 font-mono">{scene.duration}s</span>
                        {scene.status === 'rendering' && (
                          <span className="flex items-center gap-1 text-[10px] text-purple-400 font-bold animate-pulse">
                            <Loader2 className="w-3 h-3 animate-spin" /> Renderizando...
                          </span>
                        )}
                        {scene.status === 'done' && (
                          <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" /> Lista
                          </span>
                        )}
                        {scene.status === 'error' && (
                          <span className="text-[10px] text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
                            Error
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Dialogue & Spoken Line Banner */}
                    {scene.dialogue && (
                      <div className="mb-2 p-2 rounded-lg bg-indigo-950/40 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-start gap-1.5 flex-1">
                          <Mic className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[10px] font-bold text-indigo-300 mr-1.5">
                              {scene.speaker || 'Diálogo'}:
                            </span>
                            <span className="text-[11px] italic text-zinc-200">
                              "{scene.dialogue}"
                            </span>
                          </div>
                        </div>

                        {/* Voice Generation Button or Audio Preview */}
                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                          {scene.audioUrl ? (
                            <audio
                              controls
                              src={scene.audioUrl}
                              className="h-6 w-36 sm:w-44 accent-indigo-500"
                            />
                          ) : (
                            <button
                              type="button"
                              disabled={generatingVoiceSceneId === scene.id}
                              onClick={() => handleGenerateSceneVoice(idx)}
                              className="px-2 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold flex items-center gap-1 transition shadow-sm shadow-indigo-600/30"
                            >
                              {generatingVoiceSceneId === scene.id ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  <span>Sintetizando...</span>
                                </>
                              ) : (
                                <>
                                  <Volume2 className="w-3 h-3" />
                                  <span>Sintetizar Voz</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Prompt Text or Inline Editor */}
                    {editingSceneId === scene.id ? (
                      <div className="space-y-2 mt-2">
                        <textarea
                          value={editingPromptText}
                          onChange={(e) => setEditingPromptText(e.target.value)}
                          rows={3}
                          className="w-full bg-zinc-950 border border-indigo-500/60 rounded-lg p-2.5 text-[11px] text-zinc-100 placeholder-zinc-500 focus:outline-none transition leading-relaxed"
                        />
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingSceneId(null)}
                            className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-medium"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveScenePrompt(scene.id)}
                            className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold"
                          >
                            Guardar Prompt
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-zinc-300 leading-relaxed mb-2 line-clamp-3">
                        {scene.prompt}
                      </p>
                    )}

                    {/* Error display if any */}
                    {scene.status === 'error' && scene.error && (
                      <div className="mb-2 p-2 rounded bg-rose-500/10 border border-rose-500/20 text-[10px] text-rose-300">
                        {scene.error}
                      </div>
                    )}

                    {/* Keyframe / Image-to-Video Anchor Section */}
                    <div className="mb-2.5 p-2 rounded-xl bg-zinc-900/90 border border-zinc-800/80 flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {scene.imageUrl ? (
                          <div
                            className="relative group cursor-pointer shrink-0"
                            onClick={() =>
                              setActiveMedia({
                                url: scene.imageUrl!,
                                type: 'image',
                                prompt: `Foto Clave Toma ${idx + 1}: ${scene.title}`,
                              })
                            }
                            title="Haz clic para ver la foto en grande"
                          >
                            <img
                              src={scene.imageUrl}
                              alt="Keyframe"
                              className="w-12 h-12 rounded-lg object-cover border border-amber-500/50 shadow-md group-hover:scale-105 transition"
                            />
                            <span className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                              <Eye className="w-3.5 h-3.5 text-white" />
                            </span>
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-zinc-950 border border-dashed border-zinc-700/80 flex flex-col items-center justify-center text-zinc-500 text-[9px] shrink-0">
                            <ImageIcon className="w-3.5 h-3.5 mb-0.5 text-zinc-600" />
                            <span>Sin foto</span>
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold text-zinc-300">Fotograma Clave (Foto):</span>
                            {scene.imageUrl ? (
                              <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/30">
                                Rostro Congelado
                              </span>
                            ) : (
                              <span className="text-[9px] text-zinc-500">Pendiente</span>
                            )}
                          </div>
                          <p className="text-[10px] text-zinc-400 truncate">
                            {scene.imageUrl
                              ? 'Rostro fijado. Listo para animar con Veo 3.1.'
                              : 'Genera la foto primero para congelar las caras.'}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={scene.imageStatus === 'rendering' || isRenderingMovie}
                        onClick={() => handleGenerateSceneImage(idx)}
                        className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-300 hover:text-amber-200 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1 transition shadow-sm shrink-0 active:scale-95 cursor-pointer"
                      >
                        {scene.imageStatus === 'rendering' ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Creando...</span>
                          </>
                        ) : scene.imageUrl ? (
                          <>
                            <RefreshCw className="w-3 h-3 text-amber-400" />
                            <span>Cambiar Foto</span>
                          </>
                        ) : (
                          <>
                            <ImageIcon className="w-3 h-3 text-amber-400" />
                            <span>📸 Crear Foto</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Scene Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60 mt-1">
                      <div className="flex items-center gap-2">
                        {editingSceneId !== scene.id && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSceneId(scene.id);
                              setEditingPromptText(scene.prompt);
                            }}
                            className="text-[10px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition"
                          >
                            <Edit3 className="w-3 h-3 text-zinc-500" />
                            <span>Editar</span>
                          </button>
                        )}
                        {scene.videoUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              setActiveMedia({
                                url: scene.videoUrl!,
                                type: 'video',
                                prompt: `Toma ${idx + 1}: ${scene.title}`,
                              })
                            }
                            className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold transition"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Ver Clip</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteScene(scene.id)}
                          title="Eliminar esta toma del guion"
                          className="text-[10px] text-zinc-500 hover:text-rose-400 flex items-center gap-1 transition cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3 text-rose-400/80" />
                          <span>Eliminar</span>
                        </button>
                      </div>

                      {/* Render / Animate Video Button */}
                      <button
                        type="button"
                        disabled={scene.status === 'rendering' || isRenderingMovie}
                        onClick={() => handleRenderSingleScene(idx)}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer ${
                          scene.status === 'done'
                            ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                            : scene.status === 'error'
                            ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/30'
                            : scene.imageUrl
                            ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white shadow-md shadow-purple-600/30'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30'
                        }`}
                      >
                        {scene.status === 'rendering' ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>{scene.imageUrl ? 'Animando...' : 'Generando...'}</span>
                          </>
                        ) : scene.status === 'done' ? (
                          <>
                            <RefreshCw className="w-3 h-3 text-zinc-400" />
                            <span>Re-animar</span>
                          </>
                        ) : scene.status === 'error' ? (
                          <>
                            <RefreshCw className="w-3 h-3" />
                            <span>Reintentar Toma</span>
                          </>
                        ) : scene.imageUrl ? (
                          <>
                            <Play className="w-3 h-3" />
                            <span>🎬 Animar Foto (I2V)</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3" />
                            <span>Renderizar Toma</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Media Stage & Gallery (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          {/* Main Visualizer Stage */}
          <div className={`bg-zinc-900/60 border border-zinc-800/90 rounded-2xl p-4 sm:p-5 shadow-2xl backdrop-blur-xl flex flex-col transition-all duration-200 ${
            canvasSize === 'compact' ? 'min-h-[260px]' : canvasSize === 'normal' ? 'min-h-[360px]' : 'min-h-[460px]'
          }`}>
            <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5 text-indigo-400" />
                  Lienzo de Reproducción
                </span>

                {/* Canvas size controls */}
                <div className="flex items-center bg-zinc-950 p-0.5 rounded-lg border border-zinc-800 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setCanvasSize('compact')}
                    className={`px-2 py-0.5 rounded transition cursor-pointer ${
                      canvasSize === 'compact'
                        ? 'bg-indigo-600 text-white font-bold shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                    title="Ajuste compacto (más pequeño y cómodo)"
                  >
                    Ajustado
                  </button>
                  <button
                    type="button"
                    onClick={() => setCanvasSize('normal')}
                    className={`px-2 py-0.5 rounded transition cursor-pointer ${
                      canvasSize === 'normal'
                        ? 'bg-indigo-600 text-white font-bold shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                    title="Tamaño intermedio"
                  >
                    Medio
                  </button>
                  <button
                    type="button"
                    onClick={() => setCanvasSize('large')}
                    className={`px-2 py-0.5 rounded transition cursor-pointer ${
                      canvasSize === 'large'
                        ? 'bg-indigo-600 text-white font-bold shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                    title="Tamaño grande"
                  >
                    Grande
                  </button>
                </div>
              </div>

              {activeMedia && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={copyUrl}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copiado' : 'Compartir'}</span>
                  </button>
                  <a
                    href={activeMedia.url}
                    download
                    className="flex items-center gap-1 px-3 py-1 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold shadow-md transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar Película</span>
                  </a>
                </div>
              )}
            </div>

            {/* Media Canvas Box */}
            <div className={`flex-1 bg-black/90 rounded-xl border border-zinc-800/80 overflow-hidden relative flex items-center justify-center transition-all duration-200 ${
              canvasSize === 'compact' ? 'min-h-[220px] max-h-[340px]' : canvasSize === 'normal' ? 'min-h-[300px] max-h-[440px]' : 'min-h-[400px] max-h-[580px]'
            }`}>
              {loading || isRenderingMovie ? (
                <div className="text-center p-8 space-y-4">
                  <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-2 border-purple-500/20 animate-ping" />
                    <div className="w-12 h-12 rounded-full bg-purple-600/20 border border-purple-500 flex items-center justify-center text-purple-400">
                      <Film className="w-6 h-6 animate-pulse" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-200">
                      {isRenderingMovie
                        ? movieProgressMessage || 'Produciendo película con Google Flow...'
                        : 'Procesando generación en Google Flow...'}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      {isRenderingMovie
                        ? 'Generando tomas cinematográficas continuas y unificándolas con FFmpeg.'
                        : 'El modelo Veo 3.1 está ensamblando los fotogramas y la iluminación.'}
                    </p>
                    <div className="mt-3 flex items-center justify-center gap-2 font-mono text-xs text-cyan-400 bg-zinc-950 px-3 py-1 rounded-full w-max mx-auto border border-zinc-800">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Tiempo transcurrido: {elapsedTime}s</span>
                    </div>
                  </div>
                </div>
              ) : activeMedia ? (
                activeMedia.type === 'video' ? (
                  <video
                    ref={videoRef}
                    src={activeMedia.url}
                    controls
                    autoPlay
                    loop
                    className={`w-full h-full object-contain rounded-lg shadow-2xl transition-all duration-200 ${
                      canvasSize === 'compact' ? 'max-h-[320px]' : canvasSize === 'normal' ? 'max-h-[420px]' : 'max-h-[540px]'
                    }`}
                  />
                ) : (
                  <img
                    src={activeMedia.url}
                    alt="Render generado"
                    className={`w-full h-full object-contain rounded-lg transition-all duration-200 ${
                      canvasSize === 'compact' ? 'max-h-[320px]' : canvasSize === 'normal' ? 'max-h-[420px]' : 'max-h-[540px]'
                    }`}
                  />
                )
              ) : (
                <div className="text-center p-8 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
                    <Film className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-300">Ningún video en pantalla</p>
                    <p className="text-xs text-zinc-500 max-w-sm mt-1">
                      Pega tu historia en el panel izquierdo y presiona &quot;Generar Película Completa&quot; para crear tu video largo.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Prompt details below stage */}
            {activeMedia?.prompt && (
              <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-start gap-2 text-xs text-zinc-400">
                <span className="font-semibold text-zinc-300 shrink-0">Producción:</span>
                <span className="italic text-zinc-400 line-clamp-2">{activeMedia.prompt}</span>
              </div>
            )}
          </div>

          {/* Gallery of Recent Renders */}
          <div className="bg-zinc-900/60 border border-zinc-800/90 rounded-2xl p-5 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                  Galería Local ({recentRenders.length})
                </span>
              </div>
              <button
                onClick={loadGallery}
                className="text-xs text-zinc-400 hover:text-zinc-200 transition"
              >
                Actualizar
              </button>
            </div>

            {recentRenders.length === 0 ? (
              <div className="text-center py-8 text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
                Tus creaciones guardadas en <code className="text-zinc-400">public/renders</code> aparecerán aquí.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-[220px] overflow-y-auto pr-1">
                {recentRenders.map((item) => (
                  <div
                    key={item.fileName}
                    onClick={() => setActiveMedia({ url: item.url, type: item.type })}
                    className={`group relative rounded-xl border overflow-hidden cursor-pointer transition aspect-video bg-black flex items-center justify-center ${
                      activeMedia?.url === item.url
                        ? 'border-purple-500 shadow-md shadow-purple-500/20'
                        : 'border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    {item.type === 'video' ? (
                      <video src={item.url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition" />
                    ) : (
                      <img src={item.url} alt={item.fileName} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition" />
                    )}
                    <span className="absolute bottom-1 right-1 text-[9px] px-1.5 py-0.5 rounded bg-black/80 text-zinc-300 font-mono">
                      {item.fileName.startsWith('movie_') || item.fileName.startsWith('pelicula_')
                        ? 'PELÍCULA'
                        : item.type === 'video'
                        ? 'MP4'
                        : 'PNG'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* In-App Google Flow Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900/95 border border-zinc-800 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-6 relative overflow-hidden">
            {/* Ambient decorative glow */}
            <div className="absolute -top-24 -right-24 w-56 h-56 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-56 h-56 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center border ${
                    authStatus?.authenticated
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                  }`}
                >
                  {authStatus?.authenticated ? (
                    <ShieldCheck className="w-6 h-6" />
                  ) : (
                    <KeyRound className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">
                    {authStatus?.authenticated ? 'Sesión de Google Flow' : 'Iniciar Sesión en Flow'}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {authStatus?.authenticated
                      ? 'Conexión activa con el motor de Google Veo 3.1 & Nano'
                      : 'Acceso directo a generación ilimitada y gratuita'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowAuthModal(false);
                  setLoginStep('idle');
                }}
                className="w-8 h-8 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 flex items-center justify-center text-sm transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            {authStatus?.authenticated ? (
              // Connected / Authenticated View
              <div className="space-y-5">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-300">¡Tu cuenta está conectada y lista!</p>
                    <p className="text-xs text-emerald-400/80 mt-0.5">
                      Los tokens de sesión de Google Flow están guardados y listos para generar videos con Veo 3.1.
                    </p>
                  </div>
                </div>

                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-zinc-800/60">
                    <span className="text-zinc-400">Estado del servicio</span>
                    <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      Operacional
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-zinc-800/60">
                    <span className="text-zinc-400">Motores disponibles</span>
                    <span className="text-zinc-300 font-mono">Veo 3.1 (T2V) & Nano Banana (T2I)</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-zinc-400">Perfil activo</span>
                    <span className="text-zinc-300 font-mono">default (Brave)</span>
                  </div>
                </div>

                {loginFeedback && (
                  <p className="text-xs text-center text-zinc-400 italic">
                    {loginFeedback}
                  </p>
                )}

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    disabled={authActionLoading}
                    onClick={handleRenew}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${authActionLoading ? 'animate-spin' : ''}`} />
                    Renovar Token
                  </button>
                  <button
                    disabled={authActionLoading}
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Cerrar Sesión / Cambiar Cuenta
                  </button>
                </div>
              </div>
            ) : (
              // Unauthenticated / Interactive Login View
              <div className="space-y-5">
                {loginStep === 'browser_open' ? (
                  // Step 2: Browser opened, waiting for user login & polling
                  <div className="bg-zinc-950 border border-indigo-500/30 rounded-2xl p-6 text-center space-y-4">
                    <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full border-2 border-indigo-500/30 animate-ping" />
                      <div className="w-12 h-12 rounded-full bg-indigo-600/20 border border-indigo-500 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/30">
                        <Loader2 className="w-6 h-6 animate-spin" />
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-white">Navegador Brave Abierto</h4>
                      <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1">
                        Inicia sesión con tu cuenta de Google en la ventana de Brave que apareció en tu pantalla y espera a que cargue Google Flow.
                      </p>
                    </div>

                    <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800 text-[11px] text-zinc-300 flex items-center justify-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                      <span>Detectando tu sesión automáticamente en segundo plano...</span>
                    </div>

                    <div className="flex justify-center gap-2 pt-2">
                      <button
                        onClick={() => checkAuth()}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Comprobar Ahora
                      </button>
                      <button
                        onClick={() => setLoginStep('idle')}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : loginStep === 'success' ? (
                  // Step 3: Success state
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 text-center space-y-3">
                    <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center text-emerald-400 mx-auto shadow-lg shadow-emerald-500/20">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h4 className="text-base font-bold text-white">¡Conectado con Éxito!</h4>
                    <p className="text-xs text-zinc-300 max-w-sm mx-auto">
                      Tu cuenta de Google Flow está vinculada. Ya puedes comenzar a generar videos con Veo 3.1.
                    </p>
                  </div>
                ) : (
                  // Step 1: Idle - 1-Click Login
                  <>
                    <div className="bg-gradient-to-br from-indigo-950/40 via-zinc-950 to-zinc-950 p-4 rounded-2xl border border-indigo-500/20 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300">
                        <Sparkles className="w-4 h-4 text-cyan-400" />
                        Autenticación Integrada de Google Flow
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Inicia sesión con 1 solo clic. Se abrirá una ventana de Brave para autenticar tu cuenta de Google con Flow y se capturará automáticamente sin tocar ninguna consola.
                      </p>

                      <div className="grid grid-cols-3 gap-2 pt-1 text-[11px] text-zinc-300">
                        <div className="bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800/80 text-center">
                          <span className="block text-indigo-400 font-bold mb-0.5">1 Clic</span>
                          Abre Brave
                        </div>
                        <div className="bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800/80 text-center">
                          <span className="block text-cyan-400 font-bold mb-0.5">Automático</span>
                          Detecta sesión
                        </div>
                        <div className="bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800/80 text-center">
                          <span className="block text-emerald-400 font-bold mb-0.5">Veo 3.1</span>
                          Videos Gratis
                        </div>
                      </div>
                    </div>

                    {/* Browser selector */}
                    <div className="flex items-center justify-between text-xs px-1">
                      <span className="text-zinc-400">Navegador para login:</span>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedBrowser('chrome')}
                          className={`px-2.5 py-1 rounded-lg font-medium transition ${
                            selectedBrowser === 'chrome'
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          Brave Browser (Tu Navegador)
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedBrowser('auto')}
                          className={`px-2.5 py-1 rounded-lg font-medium transition ${
                            selectedBrowser === 'auto'
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          Sistema
                        </button>
                      </div>
                    </div>

                    {/* Big 1-Click Action Button */}
                    <button
                      type="button"
                      disabled={authActionLoading}
                      onClick={handleStartLogin}
                      className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-bold text-sm flex items-center justify-center gap-2.5 shadow-xl shadow-indigo-600/30 hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer"
                    >
                      {authActionLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Abriendo navegador...</span>
                        </>
                      ) : (
                        <>
                          <LogIn className="w-5 h-5" />
                          <span>Iniciar Sesión con Google (1 Clic)</span>
                        </>
                      )}
                    </button>

                    {loginFeedback && (
                      <p className="text-xs text-center text-zinc-400 italic">
                        {loginFeedback}
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Google Vids Integration Modal */}
      {vidsModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border border-blue-500/30 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl relative overflow-hidden space-y-5">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
                  <Film className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                    <span>Conexión con Google Vids</span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-[10px] text-blue-300 font-mono font-bold">
                      Listo
                    </span>
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Tu película de FlowStudio y Veo 3.1 empaquetada para Google Vids
                  </p>
                </div>
              </div>

              <button
                onClick={() => setVidsModalData(null)}
                className="w-8 h-8 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 flex items-center justify-center text-sm transition"
              >
                ✕
              </button>
            </div>

            {/* Steps & Guidance */}
            <div className="space-y-3">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold text-blue-200">¡Guion y Estructura Copiados al Portapapeles!</p>
                  <p className="text-zinc-300 leading-relaxed">
                    Hemos abierto <strong>Google Vids</strong> en tu navegador Brave. Solo tienes que hacer <strong>Ctrl + V</strong> en la casilla de Gemini en Vids para que organice la línea de tiempo.
                  </p>
                </div>
              </div>

              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-zinc-800/60">
                  <span className="text-zinc-400">Clips de Veo 3.1 listos:</span>
                  <span className="text-cyan-400 font-mono font-bold">{vidsModalData.count} tomas exportadas</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-zinc-800/60">
                  <span className="text-zinc-400">Carpeta del proyecto:</span>
                  <span className="text-zinc-300 font-mono text-[11px] truncate max-w-[220px]">{vidsModalData.folder}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-zinc-400">Dirección en la nube:</span>
                  <a
                    href="https://vids.google.com/create"
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-400 hover:underline flex items-center gap-1 font-mono"
                  >
                    vids.google.com/create <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Prompt Preview */}
              <div>
                <span className="text-[11px] font-semibold text-zinc-400 block mb-1">
                  Vista previa del guion para Google Vids:
                </span>
                <pre className="p-3 bg-black/90 border border-zinc-800 rounded-xl text-[10px] font-mono text-zinc-400 max-h-32 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                  {vidsModalData.prompt}
                </pre>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2.5 justify-end pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(vidsModalData.prompt);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Guion de Nuevo</span>
              </button>

              <a
                href="https://vids.google.com/create"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-lg shadow-blue-500/25 transition flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Ir a Google Vids</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Milo Pay-Per-Minute Recharge Modal */}
      {showPricingModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl space-y-6 relative animate-in fade-in zoom-in-95 duration-200">
            {/* Close button */}
            <button
              onClick={() => setShowPricingModal(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-indigo-500/40 shadow-xl shadow-indigo-500/20 shrink-0">
                <img src="/milo-avatar.jpg" alt="Milo" className="w-full h-full object-cover" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-extrabold text-white tracking-tight">Recarga Minutos con Milo</h3>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                    Pay-Per-Minute
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  Saldo actual: <span className="text-indigo-300 font-bold font-mono text-sm">{userMinutes.toFixed(1)} minutos</span> de video disponibles.
                </p>
              </div>
            </div>

            {/* Value proposition note */}
            <div className="bg-gradient-to-r from-indigo-950/40 to-purple-950/30 border border-indigo-500/20 rounded-2xl p-3.5 text-xs text-indigo-200 flex items-center gap-3">
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
              <p className="leading-relaxed">
                Sin suscripciones forzosas. Cada minuto equivale a <strong>60 segundos reales de video cinematográfico en Veo 3.1</strong>. Solo se descuenta lo que se renderiza con éxito.
              </p>
            </div>

            {/* Pricing Packages */}
            {/* Pricing Packages */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Pack 1: Starter */}
              <div className="bg-zinc-950/80 border border-zinc-800/90 rounded-2xl p-4 flex flex-col justify-between hover:border-zinc-700 transition">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-zinc-400">Starter</span>
                    <Coins className="w-4 h-4 text-zinc-400" />
                  </div>
                  <div className="text-2xl font-black text-white mb-0.5">15 Min</div>
                  <div className="text-xs text-zinc-400 mb-2">$3 USD <span className="text-[10px] text-emerald-400">($0.20/min)</span></div>
                  <p className="text-[11px] text-zinc-400 leading-tight">
                    Ideal para tomas rápidas, pruebas y primeros cortometrajes.
                  </p>
                </div>
                <div className="space-y-1.5 mt-4">
                  <a
                    href="https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=edinsonpc01@gmail.com&item_name=Pack+Starter+15+Min+Milo&amount=3.00&currency_code=USD"
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => {
                      setTimeout(() => handleProcessPayment('pack_15'), 1200);
                    }}
                    className="w-full py-2.5 rounded-xl bg-[#0070ba] hover:bg-[#005ea6] text-xs font-bold text-white transition flex items-center justify-center gap-1.5 shadow cursor-pointer"
                  >
                    <span>Pagar $3 con PayPal</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => handleProcessPayment('pack_15')}
                    className="w-full py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] text-zinc-400 hover:text-white transition cursor-pointer"
                  >
                    Activar / Probar Simulación
                  </button>
                </div>
              </div>

              {/* Pack 2: Popular - Creador Pro */}
              <div className="bg-gradient-to-b from-indigo-950/70 via-purple-950/30 to-zinc-950 border-2 border-indigo-500/60 rounded-2xl p-4 flex flex-col justify-between relative shadow-xl shadow-indigo-500/15">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full tracking-wider shadow">
                  ⭐ Más Popular
                </span>
                <div>
                  <div className="flex justify-between items-start mb-2 mt-1">
                    <span className="text-xs font-bold text-indigo-300">Creador Pro</span>
                    <Zap className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-2xl font-black text-white mb-0.5">60 Min</div>
                  <div className="text-xs text-indigo-300 mb-2">$6 USD <span className="text-[10px] text-emerald-400 font-semibold">($0.10/min)</span></div>
                  <p className="text-[11px] text-zinc-300 leading-tight">
                    Para creadores de contenido diario, canales de YouTube y series verticales.
                  </p>
                </div>
                <div className="space-y-1.5 mt-4">
                  <a
                    href="https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=edinsonpc01@gmail.com&item_name=Pack+Creador+Pro+60+Min+Milo&amount=6.00&currency_code=USD"
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => {
                      setTimeout(() => handleProcessPayment('pack_60'), 1200);
                    }}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-xs font-extrabold text-zinc-950 transition flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 cursor-pointer"
                  >
                    <span>Pagar $6 con PayPal</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => handleProcessPayment('pack_60')}
                    className="w-full py-1.5 rounded-xl bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-500/30 text-[10px] text-indigo-300 hover:text-white transition cursor-pointer"
                  >
                    Activar / Probar Simulación
                  </button>
                </div>
              </div>

              {/* Pack 3: Studio - Estudio Cine */}
              <div className="bg-zinc-950/80 border border-zinc-800/90 rounded-2xl p-4 flex flex-col justify-between hover:border-zinc-700 transition">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-zinc-400">Estudio Cine</span>
                    <Film className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="text-2xl font-black text-white mb-0.5">180 Min</div>
                  <div className="text-xs text-zinc-400 mb-2">$10 USD <span className="text-[10px] text-emerald-400 font-semibold">($0.05/min)</span></div>
                  <p className="text-[11px] text-zinc-400 leading-tight">
                    Para productoras audiovisuales y películas completas con alto flujo de tomas.
                  </p>
                </div>
                <div className="space-y-1.5 mt-4">
                  <a
                    href="https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=edinsonpc01@gmail.com&item_name=Pack+Estudio+Cine+180+Min+Milo&amount=10.00&currency_code=USD"
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => {
                      setTimeout(() => handleProcessPayment('pack_180'), 1200);
                    }}
                    className="w-full py-2.5 rounded-xl bg-[#0070ba] hover:bg-[#005ea6] text-xs font-bold text-white transition flex items-center justify-center gap-1.5 shadow cursor-pointer"
                  >
                    <span>Pagar $10 con PayPal</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => handleProcessPayment('pack_180')}
                    className="w-full py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] text-zinc-400 hover:text-white transition cursor-pointer"
                  >
                    Activar / Probar Simulación
                  </button>
                </div>
              </div>
            </div>

            {/* Direct PayPal info */}
            <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-3 flex items-center justify-between text-xs text-zinc-300">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                <span>Receptor PayPal Oficial: <strong className="text-white font-mono">edinsonpc01@gmail.com</strong></span>
              </div>
              <a
                href="https://paypal.me/edinsonpc01"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold underline flex items-center gap-1"
              >
                Abrir paypal.me/edinsonpc01
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Bottom info */}
            <div className="border-t border-zinc-800/80 pt-3 flex items-center justify-between text-[11px] text-zinc-400">
              <span className="flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-zinc-500" />
                Los minutos nunca caducan y se acreditan automáticamente a tu cuenta.
              </span>
              <button
                type="button"
                onClick={() => setShowPricingModal(false)}
                className="text-xs text-zinc-400 hover:text-zinc-200 transition underline cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Authentication & Onboarding Modal (Explaining Milo + Google AI Pro Requirement) */}
      {showUserAuthModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-5xl w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 overflow-hidden my-auto flex flex-col lg:flex-row">
            {/* Close button */}
            <button
              onClick={() => {
                setShowUserAuthModal(false);
                setAuthError(null);
              }}
              className="absolute top-4 right-4 z-20 p-2 rounded-full text-zinc-400 hover:text-white bg-zinc-950/60 hover:bg-zinc-800 border border-zinc-800/80 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Left Column: How Milo Works + GOOGLE AI PRO Essential Requirement */}
            <div className="lg:w-7/12 p-6 sm:p-8 bg-gradient-to-br from-zinc-950 via-zinc-900/60 to-zinc-950 border-b lg:border-b-0 lg:border-r border-zinc-800 flex flex-col justify-between space-y-6">
              <div className="space-y-5">
                {/* Milo Brand Header */}
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-indigo-500/40 shadow-xl shadow-indigo-500/20 shrink-0 relative">
                    <img src="/milo-avatar.jpg" alt="Milo" className="w-full h-full object-cover" />
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-zinc-950 shadow-[0_0_8px_#34d399]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-extrabold text-white tracking-tight">Hey Milo AI</h2>
                      <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        Auto-Director
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Tu Compañero y Director de Cine con Inteligencia Artificial
                    </p>
                  </div>
                </div>

                {/* How Milo Works */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    ¿Cómo funciona Hey Milo?
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    <div className="bg-zinc-950/70 border border-zinc-800/90 rounded-2xl p-3 space-y-1">
                      <div className="flex items-center gap-2 text-indigo-400 font-bold text-[11px]">
                        <Clapperboard className="w-4 h-4 shrink-0" />
                        <span>1. Guion a Escenas</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        Escribe tu historia y Milo la desglosa en tomas cinematográficas secuenciales de 8 segundos.
                      </p>
                    </div>

                    <div className="bg-zinc-950/70 border border-zinc-800/90 rounded-2xl p-3 space-y-1">
                      <div className="flex items-center gap-2 text-purple-400 font-bold text-[11px]">
                        <Users className="w-4 h-4 shrink-0" />
                        <span>2. Actores Consistentes</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        Mantiene los mismos rostros, expresiones y vestuario exacto a lo largo de toda la película.
                      </p>
                    </div>

                    <div className="bg-zinc-950/70 border border-zinc-800/90 rounded-2xl p-3 space-y-1">
                      <div className="flex items-center gap-2 text-pink-400 font-bold text-[11px]">
                        <Mic className="w-4 h-4 shrink-0" />
                        <span>3. Voces Neuronales</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        Sintetiza diálogos y doblaje en español latino con emoción adaptada a cada escena dramática.
                      </p>
                    </div>

                    <div className="bg-zinc-950/70 border border-zinc-800/90 rounded-2xl p-3 space-y-1">
                      <div className="flex items-center gap-2 text-cyan-400 font-bold text-[11px]">
                        <Film className="w-4 h-4 shrink-0" />
                        <span>4. Película Final en MP4</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        Renderiza con Veo 3.1 y une todos los clips con FFmpeg listos para descargar o exportar a Google Vids.
                      </p>
                    </div>
                  </div>
                </div>

                {/* CRITICAL NOTE: Google AI Pro Requirement (Prominent Golden Card) */}
                <div className="bg-gradient-to-br from-amber-500/15 via-orange-950/20 to-zinc-950 border-2 border-amber-500/60 rounded-2xl p-4 space-y-2.5 shadow-lg shadow-amber-500/10">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping shrink-0" />
                    <span className="text-xs font-black text-amber-300 uppercase tracking-wide flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-amber-400" />
                      Requisito Obligatorio: Cuenta con Google AI Pro
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-200 leading-relaxed">
                    Para que Milo pueda renderizar videos de calidad cinematográfica con el modelo <strong>Google Veo 3.1 & Nano</strong>, es indispensable que tu cuenta de Google cuente con la suscripción a <strong>Google AI Pro (Google One AI Premium / Google Flow)</strong>.
                  </p>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Milo no revende cuentas de Google; actúa como tu <strong>suite de dirección cinematográfica profesional</strong> que se vincula de forma segura a tu propia cuenta de Google Flow para crear películas continuas con tus créditos oficiales de Google.
                  </p>
                  <div className="pt-1 flex items-center justify-between flex-wrap gap-2">
                    <a
                      href="https://one.google.com/explore-plan/ai-premium"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 hover:text-amber-200 underline decoration-amber-500/60 hover:decoration-amber-300 transition"
                    >
                      <span>Verificar o suscribirme a Google AI Pro</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <span className="text-[10px] text-zinc-500">flow.google.com</span>
                  </div>
                </div>
              </div>

              {/* Bottom $3 Pass Banner Note */}
              <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
                <span className="flex items-center gap-1.5 text-zinc-300">
                  <Coins className="w-4 h-4 text-amber-400" />
                  <strong>Pase Creador:</strong> $3 USD de acceso único
                </span>
                <span className="text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-mono font-bold">
                  20 Minutos de Video incluidos
                </span>
              </div>
            </div>

            {/* Right Column: User Auth Form */}
            <div className="lg:w-5/12 p-6 sm:p-8 flex flex-col justify-between space-y-5 bg-zinc-900">
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-black text-white tracking-tight">
                    {userAuthMode === 'login' ? 'Iniciar Sesión' : 'Crea tu Cuenta de Creador'}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    {userAuthMode === 'login'
                      ? 'Accede a tu panel, proyectos y minutos disponibles.'
                      : 'Regístrate y adquiere tu Pase Creador de $3 USD (20 min incluidos).'}
                  </p>
                </div>

                {/* Mode Switcher Tabs */}
                <div className="grid grid-cols-2 p-1 bg-zinc-950 rounded-xl border border-zinc-800 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => {
                      setUserAuthMode('login');
                      setAuthError(null);
                    }}
                    className={`py-2 rounded-lg transition cursor-pointer ${
                      userAuthMode === 'login'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Iniciar Sesión
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUserAuthMode('register');
                      setAuthError(null);
                    }}
                    className={`py-2 rounded-lg transition cursor-pointer ${
                      userAuthMode === 'register'
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Crear Cuenta ($3 USD)
                  </button>
                </div>

                {/* Auth Form */}
                <form onSubmit={handleUserAuthSubmit} className="space-y-3">
                  {authError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>{authError}</span>
                    </div>
                  )}

                  {userAuthMode === 'register' && (
                    <div>
                      <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Nombre Completo</label>
                      <input
                        type="text"
                        required
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                        placeholder="Ej: Sofia Martinez"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Correo Electrónico</label>
                    <input
                      type="email"
                      required
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="tu@correo.com"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Contraseña</label>
                    <input
                      type="password"
                      required
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={authSubmitting}
                    className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-500 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/30 transition transform hover:scale-[1.01] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {authSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Procesando...</span>
                      </>
                    ) : userAuthMode === 'login' ? (
                      <>
                        <LogIn className="w-4 h-4" />
                        <span>Entrar a mi Cuenta</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>Crear Cuenta & Continuar a Pago ($3 USD)</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Quick Master Admin Login */}
              <div className="pt-4 border-t border-zinc-800/80 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span>¿Acceso Administrador?</span>
                  <span className="text-[10px] text-purple-400 font-bold bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                    VIP Master
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleFastLogin('admin@heymilo.ai', 'admin123')}
                  disabled={authSubmitting}
                  className="w-full py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-purple-500/40 text-zinc-300 hover:text-white text-[11px] font-semibold transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5 text-purple-400" />
                  <span>1-Clic: Ingresar como Admin Master</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Paywall Modal ($5 USD Creator Access Pass) */}
      {showPaywallModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5 relative animate-in fade-in zoom-in-95 duration-200">
            {/* Close button */}
            <button
              onClick={() => {
                setShowPaywallModal(false);
                setPaymentSuccessData(null);
              }}
              className="absolute top-5 right-5 p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {paymentSuccessData ? (
              // Payment Success Receipt State
              <div className="text-center py-6 space-y-4 animate-in fade-in zoom-in duration-300">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 mx-auto flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/20">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">¡Pago Confirmado con Éxito!</h3>
                  <p className="text-xs text-emerald-300 font-semibold mt-1">
                    Tu Pase Creador Hey Milo ($3 USD) ha sido activado de por vida.
                  </p>
                </div>
                <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 text-xs text-zinc-300 space-y-1.5 max-w-sm mx-auto">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Monto pagado:</span>
                    <span className="font-bold text-white">$3.00 USD</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Minutos otorgados:</span>
                    <span className="font-bold text-emerald-400">+20 Minutos Veo 3.1</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Estado de cuenta:</span>
                    <span className="font-bold text-emerald-400">Acceso Total Desbloqueado</span>
                  </div>
                </div>
                <p className="text-[11px] text-zinc-400">Entrando al estudio en un instante...</p>
              </div>
            ) : (
              // Payment Form
              <>
                {/* Header */}
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-amber-500/40 shadow-xl shadow-amber-500/20 shrink-0">
                    <img src="/milo-avatar.jpg" alt="Milo" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-black text-white tracking-tight">Pase Creador Hey Milo</h3>
                      <span className="bg-gradient-to-r from-amber-500 to-rose-500 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow">
                        $3 USD
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400">
                      Pago único de acceso para desbloquear todas las herramientas de IA
                    </p>
                  </div>
                </div>

                {/* Features Included */}
                <div className="bg-gradient-to-r from-indigo-950/40 to-purple-950/40 border border-indigo-500/30 rounded-2xl p-4 space-y-2 text-xs">
                  <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider block">
                    ¿Qué incluye tu pase de $3 USD?
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-200">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>20 Minutos de Video Veo 3.1</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Film className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span>Director de Cine con IA</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>Rostros y Actores Consistentes</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Mic className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                      <span>Voces Neuronales en Español</span>
                    </div>
                  </div>
                </div>

                {/* Direct PayPal Payment Button (Goes straight to edinsonpc01@gmail.com) */}
                <div className="space-y-2 bg-gradient-to-br from-[#003087]/20 via-[#0070ba]/10 to-zinc-950 border border-[#0070ba]/40 rounded-2xl p-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Coins className="w-4 h-4 text-amber-400" />
                      Pagar con PayPal Oficial ($3 USD)
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">edinsonpc01@gmail.com</span>
                  </div>
                  <p className="text-[11px] text-zinc-300">
                    El dinero se transfiere directamente a tu cuenta de PayPal con protección al comprador.
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <a
                      href="https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=edinsonpc01@gmail.com&item_name=Pase+Creador+Hey+Milo+AI&amount=3.00&currency_code=USD"
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => {
                        setTimeout(() => handleProcessPayment('creator_pass'), 1500);
                      }}
                      className="py-3 px-3 rounded-xl bg-[#0070ba] hover:bg-[#005ea6] text-white font-extrabold text-xs shadow-lg shadow-blue-500/20 transition flex items-center justify-center gap-2 cursor-pointer text-center"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Abrir Checkout PayPal ($3)</span>
                    </a>
                    
                    <a
                      href="https://paypal.me/edinsonpc01/3USD"
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => {
                        setTimeout(() => handleProcessPayment('creator_pass'), 1500);
                      }}
                      className="py-3 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-black text-xs shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-1.5 cursor-pointer text-center"
                    >
                      <span>Abrir paypal.me ($3 USD)</span>
                    </a>
                  </div>
                </div>

                {/* Card Payment Form */}
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400 block mb-1">O paga con Tarjeta Débito / Crédito</label>
                    <input
                      type="text"
                      value={payCardName}
                      onChange={(e) => setPayCardName(e.target.value)}
                      placeholder={currentUser?.name || 'Nombre del Titular'}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Número de Tarjeta</label>
                    <div className="relative">
                      <input
                        type="text"
                        maxLength={19}
                        value={payCardNumber}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim();
                          setPayCardNumber(val);
                        }}
                        placeholder="4242 4242 4242 4242"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-3.5 pr-10 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 font-mono transition"
                      />
                      <CreditCard className="w-4 h-4 text-zinc-500 absolute right-3 top-2.5 pointer-events-none" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Vencimiento (MM/AA)</label>
                      <input
                        type="text"
                        maxLength={5}
                        value={payCardExpiry}
                        onChange={(e) => {
                          let val = e.target.value.replace(/\D/g, '');
                          if (val.length >= 2) val = val.substring(0, 2) + '/' + val.substring(2, 4);
                          setPayCardExpiry(val);
                        }}
                        placeholder="12/28"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 font-mono transition"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-zinc-400 block mb-1">CVC / CVV</label>
                      <input
                        type="password"
                        maxLength={4}
                        value={payCardCvc}
                        onChange={(e) => setPayCardCvc(e.target.value.replace(/\D/g, ''))}
                        placeholder="123"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 font-mono transition"
                      />
                    </div>
                  </div>
                </div>

                {/* Instant Testing Simulation Button */}
                <button
                  type="button"
                  onClick={() => {
                    setPayCardNumber('4242 4242 4242 4242');
                    setPayCardExpiry('12/28');
                    setPayCardCvc('123');
                    setPayCardName(currentUser?.name || 'Creador de Prueba');
                    handleProcessPayment('creator_pass');
                  }}
                  disabled={paymentProcessing}
                  className="w-full py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-dashed border-indigo-500/40 text-[11px] text-indigo-300 font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>1-Clic: Probar con Tarjeta de Simulación ($3 USD)</span>
                </button>

                {/* Primary Payment Button */}
                <button
                  type="button"
                  onClick={() => handleProcessPayment('creator_pass')}
                  disabled={paymentProcessing}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-white font-black text-sm shadow-xl shadow-rose-500/25 transition transform hover:scale-[1.01] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {paymentProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Procesando Pago Seguro de $3 USD...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Pagar $3.00 USD & Desbloquear Acceso Ahora</span>
                    </>
                  )}
                </button>

                {/* Security Footnote */}
                <div className="flex items-center justify-center gap-3 text-[10px] text-zinc-400 pt-1">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Pago seguro cifrado SSL 256-bit • PayPal & Tarjetas
                  </span>
                  <span>•</span>
                  <span>Activación instantánea</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
