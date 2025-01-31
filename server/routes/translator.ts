import { Router } from "express";
import multer from "multer";
import path from "path";
import axios from "axios";
import fs from "fs";
import { promisify } from "util";
import { exec } from "child_process";
import { spawn } from "child_process";
import { AssemblyAI } from 'assemblyai';

const execAsync = promisify(exec);
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);

// Inicializar cliente de AssemblyAI
const assemblyai = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY || ''
});

// Inicializar el router
const router = Router();

// Configurar multer para la subida de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// Función para extraer audio usando FFmpeg del sistema
async function extractAudio(videoPath: string): Promise<string> {
  const audioPath = videoPath.replace(/\.[^/.]+$/, '') + '_audio.mp3';

  console.log('Extracting audio from:', videoPath);
  console.log('Output audio path:', audioPath);

  try {
    const command = `ffmpeg -i "${videoPath}" -vn -acodec libmp3lame -q:a 2 "${audioPath}"`;
    console.log('Executing command:', command);

    const { stdout, stderr } = await execAsync(command);
    console.log('FFmpeg stdout:', stdout);

    if (stderr) {
      console.log('FFmpeg stderr:', stderr);
    }

    if (!fs.existsSync(audioPath)) {
      throw new Error('Audio file was not created');
    }

    return audioPath;
  } catch (error) {
    console.error('FFmpeg error:', error);
    throw error;
  }
}

// Función para separar voz usando procesamiento de audio local
async function separateVoice(audioPath: string): Promise<{vocals: string, instrumental: string}> {
  const vocalsPath = audioPath.replace('_audio.mp3', '_vocals.mp3');
  const instrumentalPath = audioPath.replace('_audio.mp3', '_instrumental.mp3');

  try {
    // Ejecutar script Python para separación de voz
    const scriptPath = path.join(process.cwd(), 'server', 'scripts', 'separate_voice.py');

    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python3', [
        scriptPath,
        audioPath,
        vocalsPath,
        instrumentalPath
      ]);

      let errorOutput = '';
      let stdOutput = '';

      pythonProcess.stdout.on('data', (data) => {
        stdOutput += data.toString();
        console.log('Python stdout:', data.toString());
      });

      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
        console.error('Python stderr:', data.toString());
      });

      pythonProcess.on('close', (code) => {
        console.log('Python process exited with code:', code);
        if (code !== 0) {
          return reject(new Error(`Voice separation failed with code ${code}: ${errorOutput}`));
        }

        // Verify files exist
        if (!fs.existsSync(vocalsPath) || !fs.existsSync(instrumentalPath)) {
          return reject(new Error(`Error: Los archivos de salida no fueron generados: ${stdOutput}`));
        }

        resolve({
          vocals: vocalsPath,
          instrumental: instrumentalPath
        });
      });
    });
  } catch (error) {
    console.error('Error separating voice:', error);
    throw error;
  }
}

// Función para clonar voz usando ElevenLabs
async function cloneVoice(voicePath: string): Promise<string> {
  const voiceData = await readFile(voicePath);
  const formData = new FormData();
  formData.append('name', 'Cloned Voice');
  formData.append('files', new Blob([voiceData]), 'voice.mp3');

  const response = await axios.post(
    "https://api.elevenlabs.io/v1/voices/add",
    formData,
    {
      headers: {
        "Authorization": `Bearer ${process.env.ELEVENLABS_API_KEY}`,
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data.voice_id;
}

// Función para transcribir usando AssemblyAI
async function transcribeAudio(audioPath: string): Promise<{text: string, words: Array<{text: string, start: number, end: number}>}> {
  try {
    console.log("Starting transcription with AssemblyAI...");

    const audioFile = await fs.promises.readFile(audioPath);
    const uploadResponse = await assemblyai.files.upload(audioFile);
    console.log("File uploaded successfully, Response:", JSON.stringify(uploadResponse));

    // Validar que la respuesta contenga una URL válida
    if (!uploadResponse || typeof uploadResponse !== 'object' || !('url' in uploadResponse)) {
      throw new Error(`Invalid upload response from AssemblyAI: ${JSON.stringify(uploadResponse)}`);
    }

    const audioUrl = uploadResponse.url;
    console.log("Audio URL for transcription:", audioUrl);

    const config = {
      audio_url: audioUrl,
      language_code: "es",
      punctuate: true,
      format_text: true,
      word_timestamps: true
    };

    console.log("Creating transcript with config:", config);
    const transcript = await assemblyai.transcripts.create(config);
    console.log("Transcript created with ID:", transcript.id);

    while (true) {
      const result = await assemblyai.transcripts.get(transcript.id);
      console.log("Transcript status:", result.status);

      if (result.status === "completed") {
        const words = result.words?.map(word => ({
          text: word.text,
          start: word.start / 1000,
          end: word.end / 1000
        })) || [];

        return {
          text: result.text || "",
          words
        };
      } else if (result.status === "error") {
        throw new Error(`Transcription failed: ${result.error}`);
      }

      await new Promise(resolve => setTimeout(resolve, 3000));
    }

  } catch (error) {
    console.error("Error in transcribeAudio:", error);
    throw error;
  }
}

// Función para traducir usando OpenAI
async function translateText(text: string, targetLanguage: string) {
  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `Translate the following text to ${targetLanguage}. Maintain the same tone and style.`,
        },
        {
          role: "user",
          content: text,
        },
      ],
    },
    {
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data.choices[0].message.content;
}


// Rutas
router.post("/upload", upload.single("video"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No se subió ningún archivo" });
  }

  res.json({
    videoId: path.basename(req.file.path, path.extname(req.file.path)),
    status: 'uploaded',
    videoPath: req.file.path
  });
});

// Ruta para extraer audio
router.post("/:videoId/extract-audio", async (req, res) => {
  const { videoId } = req.params;
  const videoPath = path.join("uploads", `${videoId}.mp4`);

  try {
    console.log('Starting audio extraction for video:', videoId);
    const audioPath = await extractAudio(videoPath);
    console.log('Audio extraction completed:', audioPath);

    res.json({
      status: 'audio_extracted',
      audioPath: path.basename(audioPath),
      fullPath: audioPath
    });
  } catch (error) {
    console.error("Error extracting audio:", error);
    res.status(500).json({
      error: "Error al extraer el audio",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Ruta para separar voz
router.post("/:videoId/separate-voice", async (req, res) => {
  const { videoId } = req.params;
  const audioPath = path.join(process.cwd(), "uploads", `${videoId}_audio.mp3`);
  const vocalsPath = path.join(process.cwd(), "uploads", `${videoId}_vocals.mp3`);
  const instrumentalPath = path.join(process.cwd(), "uploads", `${videoId}_instrumental.mp3`);

  try {
    console.log("Starting voice separation for:", audioPath);

    if (!fs.existsSync(audioPath)) {
      throw new Error(`Audio file not found: ${audioPath}`);
    }

    const scriptPath = path.join(process.cwd(), 'server', 'scripts', 'separate_voice.py');
    console.log("Using script:", scriptPath);

    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python3', [
        scriptPath,
        audioPath,
        vocalsPath,
        instrumentalPath
      ]);

      let errorOutput = '';
      let stdOutput = '';

      pythonProcess.stdout.on('data', (data) => {
        stdOutput += data.toString();
        console.log('Python stdout:', data.toString());
      });

      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
        console.error('Python stderr:', data.toString());
      });

      pythonProcess.on('close', (code) => {
        console.log('Python process exited with code:', code);
        if (code !== 0) {
          return res.status(500).json({
            error: "Error al separar la voz",
            details: errorOutput,
            code: code
          });
        }

        // Verify files exist
        if (!fs.existsSync(vocalsPath) || !fs.existsSync(instrumentalPath)) {
          return res.status(500).json({
            error: "Error: Los archivos de salida no fueron generados",
            details: stdOutput
          });
        }

        res.json({
          status: 'voice_separated',
          vocals: path.basename(vocalsPath),
          instrumental: path.basename(instrumentalPath)
        });
      });
    });

  } catch (error) {
    console.error("Error separating voice:", error);
    res.status(500).json({
      error: "Error al separar la voz",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Ruta para clonar voz
router.post("/:videoId/clone-voice", async (req, res) => {
  const { videoId } = req.params;
  const vocalsPath = path.join("uploads", `${videoId}_vocals.mp3`);

  try {
    const voiceId = await cloneVoice(vocalsPath);
    res.json({
      status: 'voice_cloned',
      voiceId
    });
  } catch (error) {
    console.error("Error cloning voice:", error);
    res.status(500).json({ error: "Error al clonar la voz" });
  }
});

// Ruta para transcribir
router.post("/:videoId/transcribe", async (req, res) => {
  const { videoId } = req.params;
  const vocalsPath = path.join(process.cwd(), "uploads", `${videoId}_vocals.mp3`);

  try {
    console.log("Starting transcription for:", vocalsPath);

    if (!fs.existsSync(vocalsPath)) {
      throw new Error(`Vocals file not found: ${vocalsPath}`);
    }

    const transcription = await transcribeAudio(vocalsPath);
    console.log("Transcription completed successfully");

    res.json({
      status: 'transcribed',
      ...transcription
    });
  } catch (error) {
    console.error("Error transcribing:", error);
    res.status(500).json({
      error: "Error al transcribir el audio",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Ruta para traducir
router.post("/:videoId/translate", async (req, res) => {
  const { videoId } = req.params;
  const { text } = req.body;
  const targetLanguage = "es"; // Spanish

  try {
    const translatedText = await translateText(text, targetLanguage);
    res.json({ status: 'translated', translatedText });
  } catch (error) {
    console.error("Error translating:", error);
    res.status(500).json({ error: "Error al traducir el texto" });
  }
});

export default router;