const VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_105406_16f4600d-7a92-4292-b96e-b19156c7830a.mp4";

export function VideoBackground({ overlay = true }: { overlay?: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      <video
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        loop
        muted
        playsInline
        src={VIDEO_URL}
      />
      {overlay && <div className="absolute inset-0 bg-black/50" />}
    </div>
  );
}
