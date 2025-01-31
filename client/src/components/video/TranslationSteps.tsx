import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { type TranslationProgress, type TranslationStep } from "@/hooks/use-video-translator";
import { Check, Loader2, Download } from "lucide-react";

interface TranslationStepsProps {
  progress: TranslationProgress | null;
  isProcessing: boolean;
  onExtractAudio: () => void;
  onSeparateVoice: () => void;
  onCloneVoice: () => void;
  onTranscribe: () => void;
}

interface Step {
  id: TranslationStep;
  label: string;
  description: string;
  isEnabled: (progress: TranslationProgress) => boolean;
  action?: (progress: TranslationProgress) => void;
  getResult?: (progress: TranslationProgress) => { label: string; value: string; downloadUrls?: { label: string, url: string }[] } | null;
}

const steps: Step[] = [
  {
    id: "uploaded",
    label: "Video subido",
    description: "El video ha sido subido correctamente",
    isEnabled: () => true,
    getResult: (progress) => progress.videoId ? {
      label: "ID del video",
      value: progress.videoId,
      downloadUrls: [
        {
          label: "Descargar video",
          url: `/uploads/${progress.videoId}.mp4`
        }
      ]
    } : null
  },
  {
    id: "audio_extracted",
    label: "Audio extraído",
    description: "Audio extraído del video",
    isEnabled: (progress) => progress.step === "uploaded" || progress.step === "extracting_audio",
    getResult: (progress) => progress.audioPath ? {
      label: "Archivo de audio",
      value: progress.audioPath,
      downloadUrls: [
        {
          label: "Descargar audio",
          url: `/uploads/${progress.audioPath}`
        }
      ]
    } : null
  },
  {
    id: "voice_separated",
    label: "Voz separada",
    description: "Voz separada del audio de fondo",
    isEnabled: (progress) => progress.step === "audio_extracted" || progress.step === "separating_voice",
    getResult: (progress) => progress.vocals ? {
      label: "Archivos de audio",
      value: `Voz y pista instrumental separadas`,
      downloadUrls: [
        {
          label: "Descargar voz",
          url: `/uploads/${progress.vocals}`
        },
        {
          label: "Descargar instrumental",
          url: `/uploads/${progress.instrumental}`
        }
      ]
    } : null
  },
  {
    id: "voice_cloned",
    label: "Voz clonada",
    description: "Voz clonada para la traducción",
    isEnabled: (progress) => progress.step === "voice_separated" || progress.step === "cloning_voice",
    getResult: (progress) => progress.voiceId ? {
      label: "ID de voz",
      value: progress.voiceId
    } : null
  },
  {
    id: "transcribed",
    label: "Audio transcrito",
    description: "Audio convertido a texto",
    isEnabled: (progress) => progress.step === "voice_cloned" || progress.step === "transcribing",
    getResult: (progress) => progress.text ? {
      label: "Transcripción",
      value: progress.text
    } : null
  }
];

export function TranslationSteps({
  progress,
  isProcessing,
  onExtractAudio,
  onSeparateVoice,
  onCloneVoice,
  onTranscribe
}: TranslationStepsProps) {
  if (!progress) return null;

  const getStepAction = (step: Step): (() => void) | undefined => {
    switch (step.id) {
      case "audio_extracted":
        return onExtractAudio;
      case "voice_separated":
        return onSeparateVoice;
      case "voice_cloned":
        return onCloneVoice;
      case "transcribed":
        return onTranscribe;
      default:
        return undefined;
    }
  };

  const isStepComplete = (stepId: TranslationStep): boolean => {
    const stepIndex = steps.findIndex(s => s.id === stepId);
    const progressIndex = steps.findIndex(s => s.id === progress.step);
    return progressIndex > stepIndex;
  };

  const isCurrentStep = (stepId: TranslationStep): boolean => {
    return progress.step === stepId;
  };

  return (
    <div className="space-y-4 p-4">
      {steps.map((step, index) => {
        const isComplete = isStepComplete(step.id);
        const isCurrent = isCurrentStep(step.id);
        const result = step.getResult?.(progress);
        const action = getStepAction(step);
        const canExecute = action && step.isEnabled(progress) && !isProcessing;

        return (
          <Card key={step.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {isComplete ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : isCurrent && isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2" />
                  )}
                  <h4 className="font-medium">{step.label}</h4>
                </div>
                <p className="text-sm text-muted-foreground">{step.description}</p>

                {result && (
                  <div className="mt-2 text-sm">
                    <p className="font-medium">{result.label}:</p>
                    <code className="rounded bg-muted px-2 py-1">{result.value}</code>

                    {/* Botones de descarga */}
                    {result.downloadUrls && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {result.downloadUrls.map((download, i) => (
                          <a
                            key={i}
                            href={download.url}
                            download
                            className="inline-flex items-center gap-1 text-xs"
                          >
                            <Button variant="outline" size="sm">
                              <Download className="mr-1 h-3 w-3" />
                              {download.label}
                            </Button>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {action && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={action}
                  disabled={!canExecute}
                >
                  {isProcessing && isCurrent ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    "Iniciar"
                  )}
                </Button>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}