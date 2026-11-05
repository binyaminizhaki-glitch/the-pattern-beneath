import { art } from '../presentation/art';
export default function SceneArt({ name, className = '' }: { name: string; className?: string }) {
  return (
    <img
      className={`scene-art ${className}`}
      src={art(name)}
      alt=""
      draggable={false}
      onError={(event) => {
        event.currentTarget.style.visibility = 'hidden';
      }}
    />
  );
}
