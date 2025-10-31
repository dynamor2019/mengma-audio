import { AudioTrack } from '@/components/AudioTrack';
import { ComposedAudioPlayer } from '@/components/ComposedAudioPlayer';
import { AudioRecoveryDemo } from '@/components/AudioRecoveryDemo';
import { useAudioManager } from '@/hooks/useAudioManager';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MobileLayout from '@/layouts/MobileLayout';
import { useLocation } from 'react-router-dom';


const Index = () => {
  const location = useLocation();
  const isClassic = new URLSearchParams(location.search).has('classic');
  const {
    voiceFiles,
    musicFiles,
    isPlaying,
    voiceVolume,
    musicVolume,
    voiceMuted,
    musicMuted,
    composedAudioUrl,
    isComposing,
    voiceGain,
    musicGain,
    voicePitch,
    handleFilesUpload,
    removeFile,
    reorderFiles,
    playAudio,
    pauseAudio,
    composeAudio,
    downloadComposedAudio,
    setVoiceVolume,
    setMusicVolume,
    setVoiceMuted,
    setMusicMuted,
    setVoiceGain,
    setMusicGain,
    setVoicePitch,
    normalizeVolume,
    isNormalizingVolume
  } = useAudioManager();

  const content = (
    <>

        {/* 已移除顶部上传区，改为在各轨道内提供本地上传 */}

        {/* Audio Tracks */}
        <section className="mb-2 space-y-2">
          
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
            onNormalizeVolume={normalizeVolume}
            isNormalizingVolume={isNormalizingVolume}
            onAddVoiceFiles={(files) => handleFilesUpload(files, 'voice')}
            onAddFiles={(files) => handleFilesUpload(files, 'voice')}
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
            onAddFiles={(files) => handleFilesUpload(files, 'music')}
          />
        </section>

        
        {/* Compose Button */}
        <section className="mb-2">
          <div className="flex items-center justify-center py-2">
            <Button
              onClick={composeAudio}
              disabled={isComposing || (voiceFiles.length === 0 && musicFiles.length === 0)}
              className="relative bg-gradient-accent hover:bg-gradient-accent/90 text-black dark:text-white shadow-accent px-4 py-2 font-semibold disabled:!opacity-100 disabled:cursor-not-allowed dark:bg-none dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:shadow-none"
            >
              <Sparkles className="w-4 h-4 mr-2 pointer-events-none relative z-10" />
              <span className="pointer-events-none relative z-10">
                {isComposing ? '合成中...' : '合成音频'}
              </span>
            </Button>
          </div>
        </section>

        {/* Composed Audio Player */}
        <section className="mb-2">
          <ComposedAudioPlayer
            composedAudioUrl={composedAudioUrl}
            onDownload={downloadComposedAudio}
            isComposing={isComposing}
            onStartPlay={pauseAudio}
          />
        </section>

        {/* Audio Recovery Demo */}
        <section className="mb-2">
          <AudioRecoveryDemo />
        </section>
    </>
  );

  return isClassic ? (
    content
  ) : (
    <MobileLayout title="猛犸音频合成">{content}</MobileLayout>
  );
};

export default Index;