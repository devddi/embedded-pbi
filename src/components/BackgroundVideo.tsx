
interface BackgroundVideoProps {
  videoUrl?: string;
  opacity?: string;
}

export const BackgroundVideo = ({ 
  videoUrl = import.meta.env.VITE_LOGIN_VIDEO_URL as string,
  opacity = "opacity-30"
}: BackgroundVideoProps) => {
  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
      <video
        autoPlay
        muted
        loop
        playsInline
        className={`absolute min-w-full min-h-full object-cover ${opacity}`}
      >
        <source
          src={videoUrl}
          type="video/mp4"
        />
        Your browser does not support the video tag.
      </video>
      <div className="absolute inset-0 bg-background/40 backdrop-blur-[2px]" />
    </div>
  );
};
