import catImage from '@/assets/pet/golden-cat.png';

export function PetOverlayCat() {
  return (
    <div
      className="pet-overlay-cat pointer-events-auto h-[112px] w-[112px] drop-shadow-[0_14px_24px_rgba(84,52,23,0.28)]"
      role="img"
      aria-label="桌面猫"
    >
      <img
        src={catImage}
        alt=""
        draggable={false}
        className="h-full w-full select-none object-contain"
      />
      <span
        className="pet-overlay-cat__open-eye pet-overlay-cat__open-eye--left"
        aria-hidden="true"
      />
      <span
        className="pet-overlay-cat__open-eye pet-overlay-cat__open-eye--right"
        aria-hidden="true"
      />
    </div>
  );
}
