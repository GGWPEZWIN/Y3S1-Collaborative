export default function TripActionRow({
  left,
  right,
  helper = null,
  className = "",
}) {
  return (
    <div className={["m2-action-row", className].filter(Boolean).join(" ")}>
      <div className="m2-action-row__buttons">
        <div className="m2-action-row__slot">{left}</div>
        <div className="m2-action-row__slot">{right}</div>
      </div>
      {helper ? <p className="m2-action-helper">{helper}</p> : null}
    </div>
  );
}
