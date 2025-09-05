import { AudioUploader } from '@/components/AudioUploader';
import { AudioTrack } from '@/components/AudioTrack';

import { ComposedAudioPlayer } from '@/components/ComposedAudioPlayer';
import { useAudioManager } from '@/hooks/useAudioManager';
import { Headphones, AudioWaveform, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Index = () => {
  const {
    voiceFiles,
    musicFiles,
    isPlaying,
    currentTime,
    voiceVolume,
    musicVolume,
    voiceMuted,
    musicMuted,
    composedAudioUrl,
    isComposing,
    voiceGain,
    musicGain,
    voicePitch,
    totalDuration,
    handleFilesUpload,
    removeFile,
    reorderFiles,
    playAudio,
    stopAudio,
    resetAll,
    composeAudio,
    downloadComposedAudio,
    setVoiceVolume,
    setMusicVolume,
    setVoiceMuted,
    setMusicMuted,
    setVoiceGain,
    setMusicGain,
    setVoicePitch,
    setCurrentTime,
    normalizeVoiceVolumes,
    isNormalizingVolume,

  } = useAudioManager();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-primary rounded-full shadow-glow">
              <AudioWaveform className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              音频合成工作台
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            专业的双轨道音频编辑平台，轻松合成语音与背景音乐
          </p>
        </header>

        {/* Upload Section */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
            <Headphones className="w-6 h-6 text-primary" />
            音频文件上传
          </h2>
          <AudioUploader onFilesUpload={handleFilesUpload} />
        </section>

        {/* Audio Tracks */}
        <section className="mb-8 space-y-6">
          <h2 className="text-2xl font-semibold">音频轨道</h2>
          
          <AudioTrack
            type="voice"
            files={voiceFiles}
            onRemoveFile={(id) => removeFile(id, 'voice')}
            onReorderFiles={(start, end) => reorderFiles(start, end, 'voice')}
            isPlaying={isPlaying}
            onPlayPause={playAudio}
            volume={voiceVolume}
            onVolumeChange={setVoiceVolume}
            isMuted={voiceMuted}
            onMuteToggle={() => setVoiceMuted(!voiceMuted)}
            gain={voiceGain}
            onGainChange={setVoiceGain}
            pitch={voicePitch}
            onPitchChange={setVoicePitch}
            onNormalizeVolume={normalizeVoiceVolumes}
            isNormalizingVolume={isNormalizingVolume}
          />
          
          <AudioTrack
            type="music"
            files={musicFiles}
            onRemoveFile={(id) => removeFile(id, 'music')}
            onReorderFiles={(start, end) => reorderFiles(start, end, 'music')}
            isPlaying={isPlaying}
            onPlayPause={playAudio}
            volume={musicVolume}
            onVolumeChange={setMusicVolume}
            isMuted={musicMuted}
            onMuteToggle={() => setMusicMuted(!musicMuted)}
            gain={musicGain}
            onGainChange={setMusicGain}
          />
        </section>


        
        {/* Compose Button */}
        <section className="mb-8">
          <div className="text-center">
            <Button
              onClick={composeAudio}
              disabled={isComposing || (voiceFiles.length === 0 && musicFiles.length === 0)}
              className="bg-gradient-accent hover:bg-gradient-accent/90 text-accent-foreground shadow-accent text-lg px-8 py-3 h-auto"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              {isComposing ? '合成中...' : '合成音频'}
            </Button>
          </div>
        </section>

        {/* Composed Audio Player */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-6">合成音频播放</h2>
          <ComposedAudioPlayer
            composedAudioUrl={composedAudioUrl}
            onDownload={downloadComposedAudio}
            isComposing={isComposing}
          />
        </section>

      </div>
    </div>
  );
};

export default Index;
