/** A tutorial clip from public/videos with its WebVTT captions shown by
 *  default. Clips are recorded by tutorials/record-network.mjs, which writes
 *  `<name>.webm`, `<name>.vtt` and the poster `<name>.jpg` side by side. */
export function TutorialVideo({ name, title }: { name: string; title: string }) {
  return (
    <figure className="mt-4">
      <video
        controls
        preload="metadata"
        poster={`/videos/${name}.jpg`}
        playsInline
        className="w-full rounded-xl border border-zinc-200 bg-zinc-900"
        aria-label={title}
      >
        <source src={`/videos/${name}.webm`} type="video/webm" />
        <track kind="captions" src={`/videos/${name}.vtt`} srcLang="en" label="English" default />
        Your browser cannot play this video.{" "}
        <a href={`/videos/${name}.webm`}>Download it</a> instead.
      </video>
      <figcaption className="mt-2 text-xs text-zinc-500">{title}</figcaption>
    </figure>
  );
}
