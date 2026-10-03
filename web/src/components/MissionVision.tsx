import BrandArt from "./BrandArt";

/** What the cafe stands for: the vision in the logo's script, the mission beside it */
export default function MissionVision() {
  return (
    <section className="purpose" aria-label="Mission and vision">
      <BrandArt kind="sprig" className="purpose-sprig" />
      <div className="purpose-vision">
        <h2>Our vision</h2>
        <p>
          To be a beloved coffee destination where great coffee, good people, and everyday moments come together.
        </p>
      </div>
      <div className="purpose-mission">
        <h2>Our mission</h2>
        <p>
          To serve quality coffee with genuine warmth, creating meaningful moments and memorable experiences in every
          visit.
        </p>
      </div>
    </section>
  );
}
