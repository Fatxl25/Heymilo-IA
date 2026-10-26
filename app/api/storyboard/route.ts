import { NextResponse } from 'next/server';

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

export interface SceneItem {
  id: string;
  sceneNumber: number;
  title: string;
  shotType: string;
  prompt: string;
  duration: number;
  charactersPresent: string[];
  dialogue?: string;
  speaker?: string;
  voice?: string;
  audioUrl?: string;
}

const DEFAULT_SPANISH_VOICES = {
  female_young: { id: 'es-CO-SalomeNeural', name: 'Salomé (Colombia - Emotiva)' },
  male_young: { id: 'es-CO-GonzaloNeural', name: 'Gonzalo (Colombia - Firme)' },
  female_mature: { id: 'es-ES-ElviraNeural', name: 'Elvira (España - Madura/Dramática)' },
  male_mature: { id: 'es-MX-JorgeNeural', name: 'Jorge (México - Profundo)' },
  female_neutral: { id: 'es-MX-DaliaNeural', name: 'Dalia (México - Clara)' },
  male_neutral: { id: 'es-ES-AlvaroNeural', name: 'Álvaro (España - Intenso)' },
};

function extractCharactersFromScript(script: string): CharacterItem[] {
  const characters: CharacterItem[] = [];
  const lower = script.toLowerCase();

  // Pattern detection for named characters
  const charPatterns = [
    {
      name: 'Valentina',
      match: /\bvalentina\b/i,
      role: 'Protagonista femenina',
      gender: 'female' as const,
      faceAnchor: '28-year-old Colombian woman, sharp elegant facial features, almond brown eyes, sleek long dark brunette hair',
      outfit: 'wearing an elegant tailored crimson red dress',
      voice: DEFAULT_SPANISH_VOICES.female_young.id,
      voiceName: DEFAULT_SPANISH_VOICES.female_young.name,
    },
    {
      name: 'Alejandro',
      match: /\balejandro\b/i,
      role: 'Coprotagonista masculino',
      gender: 'male' as const,
      faceAnchor: '35-year-old handsome Latin businessman, defined jawline, short neatly combed dark hair, intense expressive gaze',
      outfit: 'wearing a sharp black designer suit and white dress shirt',
      voice: DEFAULT_SPANISH_VOICES.male_young.id,
      voiceName: DEFAULT_SPANISH_VOICES.male_young.name,
    },
    {
      name: 'Isabel',
      match: /\bisabel\b/i,
      role: 'Matriarca / Antagonista dramática',
      gender: 'female' as const,
      faceAnchor: '55-year-old sophisticated matriarch, poised aristocratic facial features, styled silver-streaked dark hair, intense dramatic expressions',
      outfit: 'wearing a high-neck luxurious black evening gown with pearl jewelry',
      voice: DEFAULT_SPANISH_VOICES.female_mature.id,
      voiceName: DEFAULT_SPANISH_VOICES.female_mature.name,
    },
    {
      name: 'Carlos',
      match: /\bcarlos\b/i,
      role: 'Personaje secundario masculino',
      gender: 'male' as const,
      faceAnchor: '40-year-old Latin man, trimmed goatee beard, observant eyes, dark wavy hair',
      outfit: 'wearing a navy blue blazer and dark trousers',
      voice: DEFAULT_SPANISH_VOICES.male_mature.id,
      voiceName: DEFAULT_SPANISH_VOICES.male_mature.name,
    },
    {
      name: 'Elena',
      match: /\belena\b/i,
      role: 'Personaje femenino',
      gender: 'female' as const,
      faceAnchor: '30-year-old elegant woman, shoulder-length wavy auburn hair, hazel eyes',
      outfit: 'wearing a casual chic emerald green blouse',
      voice: DEFAULT_SPANISH_VOICES.female_neutral.id,
      voiceName: DEFAULT_SPANISH_VOICES.female_neutral.name,
    },
  ];

  for (const pat of charPatterns) {
    if (pat.match.test(script)) {
      characters.push({
        id: `char_${pat.name.toLowerCase()}`,
        name: pat.name,
        role: pat.role,
        gender: pat.gender,
        faceAnchor: pat.faceAnchor,
        outfit: pat.outfit,
        voice: pat.voice,
        voiceName: pat.voiceName,
      });
    }
  }

  // If no known named characters found, detect generic roles or create standard anchors
  if (characters.length === 0) {
    if (lower.includes('mujer') || lower.includes('ella') || lower.includes('woman') || lower.includes('girl')) {
      characters.push({
        id: 'char_protagonista_f',
        name: 'Protagonista Femenina',
        role: 'Protagonista principal',
        gender: 'female',
        faceAnchor: '28-year-old photorealistic woman, consistent symmetric facial features, natural emotive expressions, neat dark hair',
        outfit: 'consistent cinematic wardrobe',
        voice: DEFAULT_SPANISH_VOICES.female_young.id,
        voiceName: DEFAULT_SPANISH_VOICES.female_young.name,
      });
    }
    if (lower.includes('hombre') || lower.includes('él') || lower.includes('man') || lower.includes('boy')) {
      characters.push({
        id: 'char_protagonista_m',
        name: 'Protagonista Masculino',
        role: 'Protagonista principal',
        gender: 'male',
        faceAnchor: '35-year-old photorealistic man, defined jawline, short groomed dark hair, emotive eyes',
        outfit: 'consistent dark casual-formal attire',
        voice: DEFAULT_SPANISH_VOICES.male_young.id,
        voiceName: DEFAULT_SPANISH_VOICES.male_young.name,
      });
    }
  }

  return characters;
}

function extractDialogueFromText(text: string, characters: CharacterItem[]) {
  // Matches dialogues in quotes: "...", “...”, «...»
  const quoteMatch = text.match(/["“”«»]([^"“”«»]{2,})["“”«»]/);
  if (quoteMatch && quoteMatch[1]) {
    const dialogue = quoteMatch[1].trim();
    const beforeQuote = text.slice(0, quoteMatch.index || 0);
    
    // Find speaker by proximity before the quote
    let speaker = characters[0]?.name || 'Voz del Personaje';
    let voice = characters[0]?.voice || DEFAULT_SPANISH_VOICES.female_young.id;

    for (const char of characters) {
      if (new RegExp(`\\b${char.name}\\b`, 'i').test(beforeQuote)) {
        speaker = char.name;
        voice = char.voice;
        break;
      }
    }

    return { speaker, dialogue, voice };
  }

  return null;
}

import { requirePaidAccess } from '@/lib/auth-server';

export async function POST(req: Request) {
  try {
    const { user, error: authError, status: authStatus } = await requirePaidAccess();
    if (authError || !user) {
      return NextResponse.json(
        {
          error: authError || 'Acceso restringido. Debes iniciar sesión y activar el Pase Creador de $3 USD.',
          requiresPayment: authStatus === 402,
          requiresLogin: authStatus === 401,
        },
        { status: authStatus || 401 }
      );
    }

    const body = await req.json();
    const {
      script,
      targetDuration = 48,
      aspect = '9:16',
      characters: customCharacters,
      scenes: existingScenes,
      action = 'generate',
    } = body;
    const clampedDuration = Math.min(480, Math.max(16, Number(targetDuration) || 48));

    // Action: Re-adjust existing scene prompts with updated character anchors
    if (action === 'adjust_prompts' && existingScenes && customCharacters) {
      const updatedScenes = existingScenes.map((sc: SceneItem) => {
        // Find which characters are in this scene
        const relevantChars = customCharacters.filter((c: CharacterItem) =>
          sc.charactersPresent?.includes(c.name) || sc.prompt.includes(c.name)
        );

        const consistencyTokens = relevantChars.length > 0
          ? relevantChars.map((c: CharacterItem) => `[Character ${c.name}: ${c.faceAnchor}, ${c.outfit}]`).join(' ')
          : customCharacters.map((c: CharacterItem) => `[Character ${c.name}: ${c.faceAnchor}, ${c.outfit}]`).join(' ');

        // Keep cinematic base, clean previous anchor tags, append fresh tokens
        let cleanBase = sc.prompt.replace(/\[Character[^\]]+\]/g, '').trim();
        const adjustedPrompt = `${cleanBase} ${consistencyTokens}`.trim();

        // Also update voice if speaker is in customCharacters
        let updatedVoice = sc.voice;
        if (sc.speaker) {
          const matchChar = customCharacters.find((c: CharacterItem) => c.name.toLowerCase() === sc.speaker?.toLowerCase());
          if (matchChar) updatedVoice = matchChar.voice;
        }

        return {
          ...sc,
          prompt: adjustedPrompt,
          voice: updatedVoice,
        };
      });

      return NextResponse.json({
        success: true,
        scenes: updatedScenes,
        characters: customCharacters,
      });
    }

    if (!script || typeof script !== 'string' || !script.trim()) {
      return NextResponse.json({ error: 'El guion o prompt es obligatorio' }, { status: 400 });
    }

    const cleanScript = script.trim();
    const characters = customCharacters && customCharacters.length > 0
      ? customCharacters
      : extractCharactersFromScript(cleanScript);

    // Build Master Character Anchor for global consistency
    const masterCharacterTokens = characters
      .map((c: CharacterItem) => `[Character ${c.name}: ${c.faceAnchor}, ${c.outfit}]`)
      .join(' ');

    const sceneDuration = 8;
    const targetCount = Math.max(2, Math.min(60, Math.round(clampedDuration / sceneDuration)));

    // Style keywords
    const styleKeywords = [
      'cinematic',
      'hyper-realistic',
      'photorealistic',
      '35mm',
      'lens',
      'palette',
      'lighting',
      'moody',
      'atmosphere',
      'telenovela',
      'drama',
    ];

    let extractedStyle = 'Cinematic film shot, 35mm lens, photorealistic Latin television drama, dramatic volumetric lighting, highly detailed face textures';

    // 1. Detect explicit scene blocks (e.g. "SCENE 1:", "ESCENA 1:", "TOMA 1 - 8s:", etc.)
    const explicitSceneRegex = /(?:^|\n|\r|[.!?]\s*)(?:SCENE|ESCENA|TOMA|PARTE)\s*(\d+)[\s:—–-]+(?:[^\n:—–]*?SECONDS[^\n:—–]*?)?[:—–-]?\s*/gi;
    const explicitMatches = [...cleanScript.matchAll(explicitSceneRegex)];

    let parsedBeats: string[] = [];
    if (explicitMatches.length >= 2) {
      for (let i = 0; i < explicitMatches.length; i++) {
        const start = explicitMatches[i].index! + explicitMatches[i][0].length;
        const end = i + 1 < explicitMatches.length ? explicitMatches[i + 1].index! : cleanScript.length;
        let chunk = cleanScript.slice(start, end).trim();
        chunk = chunk.replace(/(?:VISUAL STYLE|STYLE|CHARACTER CONSISTENCY|PROMPT):?[\s\S]*$/i, '').trim();
        if (chunk.length > 5) {
          parsedBeats.push(chunk);
        }
      }
    }

    const scenePrompts: string[] = [];
    if (parsedBeats.length >= 2) {
      if (parsedBeats.length < targetCount) {
        // Expand explicit beats across targetCount so the full requested movie length is fulfilled
        const repetitionFactor = Math.ceil(targetCount / parsedBeats.length);
        for (let i = 0; i < targetCount; i++) {
          const beatIndex = Math.floor(i / repetitionFactor);
          const baseBeat = parsedBeats[beatIndex] || parsedBeats[parsedBeats.length - 1];
          const part = (i % repetitionFactor) + 1;
          scenePrompts.push(repetitionFactor > 1 ? `${baseBeat} (Continuación Parte ${part})` : baseBeat);
        }
      } else {
        parsedBeats.forEach((b) => scenePrompts.push(b));
      }
    } else {
      const sentences = cleanScript
        .split(/(?<=[.!?])\s+|\n+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 5);

      const firstSentence = sentences[0] || '';
      if (styleKeywords.some((kw) => firstSentence.toLowerCase().includes(kw))) {
        extractedStyle = firstSentence;
      }

      // Filter narrative sentences
      const narrativeSentences = sentences.filter((s) => {
        const lower = s.toLowerCase();
        return !lower.startsWith('accompany the entire video') &&
          !lower.startsWith('maintain a slow') &&
          !lower.startsWith('character consistency:');
      });

      if (narrativeSentences.length <= targetCount) {
        narrativeSentences.forEach((s) => scenePrompts.push(s));
        while (scenePrompts.length < targetCount && scenePrompts.length > 0) {
          const last = scenePrompts[scenePrompts.length - 1];
          scenePrompts.push(`Continuing narrative beat: ${last}`);
        }
      } else {
        const chunkSize = Math.ceil(narrativeSentences.length / targetCount);
        for (let i = 0; i < narrativeSentences.length; i += chunkSize) {
          scenePrompts.push(narrativeSentences.slice(i, i + chunkSize).join(' '));
        }
      }
    }

    const shotTypes = [
      'Primer Plano Emotivo (Dramatic Close-Up)',
      'Plano Medio con Tensión (Medium Tension Shot)',
      'Plano Contrapicado (Low Angle Confrontation)',
      'Plano Detalle (Extreme Close-Up Detail)',
      'Plano Secuencia Dinámico (Dynamic Tracking)',
      'Plano General Cinematográfico (Wide Cinematic Shot)',
      'Paneo Lento Dramático (Slow Emotional Pan)',
      'Clímax con Desvanecimiento (Final Climax Pan)',
    ];

    const scenes: SceneItem[] = scenePrompts.slice(0, targetCount).map((narrativeBeat, index) => {
      const shotType = shotTypes[index % shotTypes.length];

      // Identify which characters are involved in this beat
      const presentInScene = characters
        .filter((c: CharacterItem) => narrativeBeat.toLowerCase().includes(c.name.toLowerCase()))
        .map((c: CharacterItem) => c.name);

      const sceneCharacterTokens = presentInScene.length > 0
        ? characters.filter((c: CharacterItem) => presentInScene.includes(c.name)).map((c: CharacterItem) => `[Character ${c.name}: ${c.faceAnchor}, ${c.outfit}]`).join(' ')
        : masterCharacterTokens;

      // Extract spoken dialogue if present
      const dialogueInfo = extractDialogueFromText(narrativeBeat, characters);

      // Clean prompt: style + narrative beat + strict character face & wardrobe anchors
      const promptText = `${extractedStyle}. ${narrativeBeat}. ${sceneCharacterTokens} Continuous consistent faces and exact wardrobe.`.trim();

      return {
        id: `scene_${index + 1}_${Date.now()}_${index}`,
        sceneNumber: index + 1,
        title: `Toma ${index + 1}: ${narrativeBeat.slice(0, 35)}...`,
        shotType,
        prompt: promptText,
        duration: sceneDuration,
        charactersPresent: presentInScene.length > 0 ? presentInScene : characters.map((c: CharacterItem) => c.name),
        dialogue: dialogueInfo?.dialogue,
        speaker: dialogueInfo?.speaker,
        voice: dialogueInfo?.voice,
      };
    });

    return NextResponse.json({
      success: true,
      masterStyle: extractedStyle,
      targetDuration: clampedDuration,
      totalScenes: scenes.length,
      aspect,
      characters,
      scenes,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error al desglosar el guion' }, { status: 500 });
  }
}
