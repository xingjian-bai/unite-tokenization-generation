import { useEffect, useMemo, useState } from "react";

const navItems = [
  { label: "Overview", href: "#overview" },
  { label: "Insight", href: "#insight" },
  { label: "Training", href: "#training" },
  { label: "Results", href: "#results" },
  { label: "Analysis", href: "#analysis" },
  { label: "Citation", href: "#citation" },
];

const highlightCards = [
  {
    title: "Single-stage from scratch",
    body: "UNITE jointly learns tokenization and latent denoising in one training run, instead of freezing a pretrained tokenizer and training a separate generator later.",
  },
  {
    title: "No external teacher required",
    body: "The core system does not depend on a DINO-like pretrained encoder or adversarial losses to reach strong latent generation quality.",
  },
];

const failureCards = [
  {
    tag: "Naive recipe",
    title: "Backprop denoising through z = E(x)",
    body: "A straightforward end-to-end setup lets denoising gradients directly reshape the tokenizer output while reconstruction tries to preserve instance detail.",
  },
  {
    tag: "Why this breaks",
    title: "Easy-to-denoise latents need not be informative",
    body: "Low-information or partially collapsed latents can reduce denoising difficulty while hurting sample quality and semantic richness.",
  },
  {
    tag: "What UNITE changes",
    title: "Detach preserves symmetry in optimization",
    body: "Reconstruction and denoising still update the same shared weights, but the stop-gradient removes the most destabilizing shortcut through the clean latent.",
  },
];

const insightSteps = [
  {
    label: "Tokenization",
    text: "With a fully observed image x, the model infers a clean latent that is tightly constrained by the input.",
  },
  {
    label: "Generation",
    text: "With a noisy latent zt, the model solves the same latent inference problem under much weaker observability.",
  },
  {
    label: "UNITE",
    text: "This view motivates a single shared Generative Encoder GEθ that can serve both roles without splitting the pipeline into stages.",
  },
];

const trainingModes = [
  {
    id: "tokenize",
    label: "Tokenizer pass",
    eyebrow: "Pass 1",
    title: "Encode image patches into latent registers",
    body: "UNITE concatenates image patch tokens with Gaussian-initialized registers. After one pass through the Generative Encoder, those registers become the latent z0 used for reconstruction.",
    detail: "This keeps the tokenizer interface simple: image in, latent registers out.",
  },
  {
    id: "denoise",
    label: "Denoising pass",
    eyebrow: "Pass 2",
    title: "Corrupt the latent and run the same network again",
    body: "The latent z0 is noised into zt and fed back into the same Generative Encoder, now without image patches, to predict the clean latent target during flow matching.",
    detail: "The architecture stays minimal because the tokenizer and denoiser are the same module under different conditioning regimes.",
  },
  {
    id: "detach",
    label: "Detach matters",
    eyebrow: "Design choice",
    title: "Stop-gradient stabilizes joint training",
    body: "Detaching z0 before corruption blocks denoising gradients from pushing directly through the tokenization pathway. Reconstruction and denoising still shape the same shared weights, but through separate backward routes.",
    detail: "This is the key choice that lets the page argue for end-to-end training without pretending naive end-to-end always works.",
  },
];

const resultTabs = [
  { id: "generation", label: "ImageNet Generation" },
  { id: "reconstruction", label: "Reconstruction" },
  { id: "molecules", label: "Molecules" },
];

const generationRows = [
  { method: "JiT-B/16", note: "single-stage pixel", fid: "3.66", is: "275.1" },
  { method: "UNITE-B", note: "single-stage, joint", fid: "2.27", is: "311.8", ours: true },
  { method: "DiT-XL/2", note: "two-stage latent", fid: "2.27", is: "278.2" },
  { method: "SiT-XL/2", note: "two-stage latent", fid: "2.06", is: "277.5" },
  { method: "UNITE-XL-B", note: "single-stage, joint", fid: "1.88", is: "309.9", ours: true },
  { method: "UNITE-XL-L", note: "single-stage, joint", fid: "1.82", is: "303.8", ours: true },
];

const reconstructionRows = [
  { method: "ViTok-B/16 (stage-1 only)", adv: "No", teacher: "No", rfid: "1.63" },
  { method: "UNITE-B", adv: "No", teacher: "No", rfid: "1.01", ours: true },
  { method: "UNITE-B + GAN decoder ft", adv: "Decoder-only", teacher: "No", rfid: "0.51", ours: true },
  { method: "RAE", adv: "Yes", teacher: "DINOv2", rfid: "0.58" },
  { method: "VA-VAE", adv: "Yes", teacher: "DINOv2", rfid: "0.28" },
];

const moleculeRows = [
  { method: "ADiT Tokenizer", match: "97.20", rmsd: "0.075", valid: "—", unique: "—" },
  { method: "ADiT-S QM9-only", match: "—", rmsd: "—", valid: "96.02", unique: "97.76" },
  { method: "UNITE-S", match: "99.37", rmsd: "0.039", valid: "94.90", unique: "99.71", ours: true },
];

const sampleCards = [
  {
    title: "House finch",
    image: "./assets/samples-web/house-finch.jpg",
    body: "Uncurated class-conditional samples show consistent shape, color, and pose diversity within a single class.",
  },
  {
    title: "Golden retriever",
    image: "./assets/samples-web/golden-retriever.jpg",
    body: "The samples reinforce the quantitative story: joint training does not only work in tables, it produces stable and diverse class-conditional generations.",
  },
  {
    title: "Sea anemone",
    image: "./assets/samples-web/sea-anemone.jpg",
    body: "Dense texture categories make the latent representation quality visually obvious to a reader in seconds.",
  },
];

const analysisCards = [
  {
    title: "Joint training dynamics are not monotonic",
    image: "./assets/figures/training_dynamics.png",
    body: "Generation quality can improve even as denoising loss rises, which is why latent quality cannot be judged by denoising loss alone.",
  },
  {
    title: "Detach + weight sharing is the stable point",
    image: "./assets/figures/stop_grad_ablations_sep_vs_ours.png",
    body: "Under weight sharing, more denoising iterations improve generation while preserving reconstruction much better than separate encoder-denoiser training.",
  },
  {
    title: "Tokenizer and denoiser are intrinsically aligned",
    image: "./assets/figures/cka_ablation_plot_v2.png",
    body: "Layer-wise CKA and CKNNA suggest the two modes already want to solve closely related computations, which is why sharing works at all.",
  },
];

const resourceLinks = [
  { label: "Paper PDF", href: "./assets/docs/unite-paper.pdf" },
  { label: "Method section", href: "#training" },
  { label: "Main results", href: "#results" },
];

const bibtex = `@inproceedings{duggal2026unite,
  title     = {End-to-End Training for Unified Tokenization and Latent Denoising},
  author    = {Shivam Duggal and Xingjian Bai and Zongze Wu and Richard Zhang and Eli Shechtman and Antonio Torralba and Phillip Isola and William T. Freeman},
  booktitle = {International Conference on Machine Learning},
  year      = {2026}
}`;

function SectionHeading({ kicker, title, subtitle }) {
  return (
    <div className="section-heading reveal">
      <p className="section-kicker">{kicker}</p>
      <h2>{title}</h2>
      {subtitle ? <p className="section-subtitle">{subtitle}</p> : null}
    </div>
  );
}

function ResultTable({ activeTab }) {
  if (activeTab === "reconstruction") {
    return (
      <div className="table-wrap">
        <div className="result-table table-four">
          <div className="table-head">
            <span>Tokenizer</span>
            <span>Adv.</span>
            <span>Teacher</span>
            <span>rFID ↓</span>
          </div>
          {reconstructionRows.map((row) => (
            <div className={`table-row ${row.ours ? "table-row-ours" : ""}`} key={row.method}>
              <span className="cell cell-primary" data-label="Tokenizer">
                {row.method}
              </span>
              <span className="cell" data-label="Adv.">
                {row.adv}
              </span>
              <span className="cell" data-label="Teacher">
                {row.teacher}
              </span>
              <strong className="cell cell-strong" data-label="rFID ↓">
                {row.rfid}
              </strong>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activeTab === "molecules") {
    return (
      <div className="table-wrap">
        <div className="result-table table-five">
          <div className="table-head">
            <span>Method</span>
            <span>Match %</span>
            <span>RMSD Å</span>
            <span>Valid %</span>
            <span>Unique %</span>
          </div>
          {moleculeRows.map((row) => (
            <div className={`table-row ${row.ours ? "table-row-ours" : ""}`} key={row.method}>
              <span className="cell cell-primary" data-label="Method">
                {row.method}
              </span>
              <span className="cell" data-label="Match %">
                {row.match}
              </span>
              <span className="cell" data-label="RMSD Å">
                {row.rmsd}
              </span>
              <span className="cell" data-label="Valid %">
                {row.valid}
              </span>
              <strong className="cell cell-strong" data-label="Unique %">
                {row.unique}
              </strong>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <div className="result-table table-four">
        <div className="table-head">
          <span>Method</span>
          <span>Regime</span>
          <span>FID ↓</span>
          <span>IS ↑</span>
        </div>
        {generationRows.map((row) => (
          <div className={`table-row ${row.ours ? "table-row-ours" : ""}`} key={row.method}>
            <span className="cell cell-primary" data-label="Method">
              {row.method}
            </span>
            <span className="cell" data-label="Regime">
              {row.note}
            </span>
            <strong className="cell cell-strong" data-label="FID ↓">
              {row.fid}
            </strong>
            <span className="cell" data-label="IS ↑">
              {row.is}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function App() {
  const [trainingMode, setTrainingMode] = useState("detach");
  const [activeResultTab, setActiveResultTab] = useState("generation");
  const currentMode = useMemo(
    () => trainingModes.find((mode) => mode.id === trainingMode),
    [trainingMode]
  );

  useEffect(() => {
    const nodes = document.querySelectorAll(".reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    nodes.forEach((node) => observer.observe(node));

    return () => observer.disconnect();
  }, []);

  async function copyBibtex() {
    try {
      await navigator.clipboard.writeText(bibtex);
    } catch (error) {
      console.error("Failed to copy citation", error);
    }
  }

  return (
    <div className="shell">
      <div className="page-noise" aria-hidden="true" />
      <header className="site-header">
        <a className="brand" href="#overview">
          UNITE
        </a>
        <nav className="site-nav">
          {navItems.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
      </header>

      <main className="page">
        <section className="hero reveal" id="overview">
          <div className="hero-copy">
            <p className="hero-kicker">ICML 2026 · MIT & Adobe</p>
            <h1>UNITE</h1>
            <p className="hero-title-extended">
              End-to-End Training for Unified Tokenization and Latent Denoising
            </p>
            <p className="hero-summary">
              Tokenization and generation are usually trained in stages. UNITE
              starts from a different view: tokenization is latent inference
              under strong observability, and generation is the same problem
              under weak observability.
            </p>

            <div className="hero-authors">
              <p>
                Shivam Duggal*, Xingjian Bai*, Zongze Wu, Richard Zhang, Eli
                Shechtman, Antonio Torralba, Phillip Isola, William T. Freeman
              </p>
              <p className="meta-line">Massachusetts Institute of Technology · Adobe</p>
              <p className="meta-line">* equal contribution</p>
            </div>

            <div className="hero-actions">
              <a className="button primary" href="./assets/docs/unite-paper.pdf">
                Paper PDF
              </a>
              <a className="button" href="#results">
                Key Results
              </a>
              <a className="button" href="#training">
                Training Loop
              </a>
            </div>

            <div className="hero-metrics">
              <div>
                <span>ImageNet FID</span>
                <strong>2.27</strong>
                <small>UNITE-B</small>
              </div>
              <div>
                <span>Best XL FID</span>
                <strong>1.82</strong>
                <small>UNITE-XL-L</small>
              </div>
              <div>
                <span>Reconstruction rFID</span>
                <strong>1.01</strong>
                <small>no adv., no teacher</small>
              </div>
              <div>
                <span>External teacher</span>
                <strong>None</strong>
                <small>train from scratch</small>
              </div>
            </div>
          </div>

          <div className="hero-visual">
            <div className="figure-card hero-figure-card plate">
              <div className="figure-note">
                Paper teaser · shared latent manifold, shared encoder, two modes
              </div>
              <img src="./assets/figures/teaser2.png" alt="UNITE teaser figure" />
            </div>
          </div>
        </section>

        <section className="section problem-section" id="problem">
          <SectionHeading
            kicker="Why This Matters"
            title="Why staged latent pipelines leave performance on the table"
            subtitle="Standard latent diffusion works by splitting tokenization and generation into separate stages. UNITE asks what happens if the latent interface is learned jointly instead."
          />

          <div className="problem-grid">
            <article className="info-card reveal">
              <p className="card-kicker">Conventional recipe</p>
              <h3>First learn a tokenizer. Then freeze it.</h3>
              <p>
                In standard latent diffusion pipelines, the encoder is trained as
                a tokenizer and then treated as fixed infrastructure while a
                separate denoiser learns the latent distribution.
              </p>
              <div className="formula-box">
                <span>VAE / LDM</span>
                <code>z = E(x), x̂ = D(z), ẑ = G(z_t, t)</code>
              </div>
            </article>

            <article className="info-card accent reveal">
              <p className="card-kicker">UNITE claim</p>
              <h3>Let reconstruction and generation shape the same latent space.</h3>
              <p>
                UNITE replaces the separate tokenizer and latent denoiser with a
                shared Generative Encoder, keeping the system minimal while
                allowing the two objectives to co-design the representation.
              </p>
              <div className="formula-box">
                <span>UNITE</span>
                <code>z = GEθ(x), x̂ = D(z), ẑ = GEθ(z_t, t)</code>
              </div>
            </article>
          </div>

          <div className="highlight-grid">
            {highlightCards.map((card) => (
              <article className="highlight-card reveal utility-card" key={card.title}>
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section" id="naive">
          <SectionHeading
            kicker="Naive End-to-End"
            title="Why not simply backprop denoising through the tokenizer?"
            subtitle="Naive joint training can favor latents that are easy to denoise but weak for reconstruction and sample quality."
          />

          <div className="failure-grid">
            {failureCards.map((card) => (
              <article className="failure-card reveal" key={card.title}>
                <span>{card.tag}</span>
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section insight-layout" id="insight">
          <div className="sticky-column">
            <div className="figure-card reveal sticky-card plate">
              <img
                src="./assets/figures/shared_latent_space5.png"
                alt="Shared latent space figure"
                loading="lazy"
              />
            </div>
          </div>

          <div className="flow-column">
            <SectionHeading
              kicker="Core Insight"
              title="Tokenization is generation with strong observability"
              subtitle="The tokenizer and denoiser are not unrelated modules. They solve the same latent inference problem under different conditioning regimes."
            />

            <div className="step-stack">
              {insightSteps.map((step) => (
                <article className="step-card reveal" key={step.label}>
                  <span>{step.label}</span>
                  <p>{step.text}</p>
                </article>
              ))}
            </div>

            <div className="insight-bridge reveal">
              If tokenization and denoising are two regimes of the same
              inference problem, the natural next question is whether they
              should share parameters.
            </div>
          </div>
        </section>

        <section className="section training-section" id="training">
          <SectionHeading
            kicker="Training Loop"
            title="Two forward passes. One shared encoder."
            subtitle="UNITE tokenizes an image into latent registers, corrupts them, and runs the same Generative Encoder again as a latent denoiser."
          />

          <div className="training-grid">
            <div className="figure-card reveal plate utility-figure">
              <img
                src="./assets/figures/architecture_uldae_v3.png"
                alt="UNITE training architecture"
                loading="lazy"
              />
            </div>

            <div className="training-panel reveal">
              <div className="pill-row">
                {trainingModes.map((mode) => (
                  <button
                    key={mode.id}
                    className={mode.id === trainingMode ? "pill active" : "pill"}
                    onClick={() => setTrainingMode(mode.id)}
                    type="button"
                  >
                    {mode.label}
                  </button>
                ))}
              </div>

              <div className="training-copy">
                <p className="card-kicker">{currentMode.eyebrow}</p>
                <h3>{currentMode.title}</h3>
                <p>{currentMode.body}</p>
                <p className="training-detail">{currentMode.detail}</p>
              </div>

              <div className="detachment-note">
                <h4>Detach is a core design choice</h4>
                <p>
                  Stop-gradient removes the most destabilizing shortcut through
                  the clean latent while still allowing reconstruction and
                  denoising to co-train the same shared weights.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="section results-section" id="results">
          <SectionHeading
            kicker="Results"
            title="Single-stage, teacher-free, and competitive"
            subtitle="UNITE reaches strong ImageNet generation and reconstruction quality without relying on a pretrained visual teacher or a staged tokenizer pipeline."
          />

          <div className="results-tall-grid">
            <article className="stat-band reveal utility-card">
              <div>
                <span>ImageNet-256</span>
                <strong>2.27 FID</strong>
                <p>UNITE-B improves over JiT-B while training the tokenizer and generator jointly.</p>
              </div>
              <div>
                <span>Teacher-free</span>
                <strong>No DINO</strong>
                <p>The core formulation does not require an external pretrained encoder.</p>
              </div>
              <div>
                <span>Reconstruction</span>
                <strong>1.01 rFID</strong>
                <p>Strong reconstruction without adversarial loss or pretrained visual supervision.</p>
              </div>
              <div>
                <span>Cheaper route</span>
                <strong>No DINO pretraining</strong>
                <p>UNITE removes the dependency bottleneck of teacher-pretrained latent pipelines.</p>
              </div>
            </article>

            <div className="result-controls reveal">
              {resultTabs.map((tab) => (
                <button
                  key={tab.id}
                  className={tab.id === activeResultTab ? "tab active" : "tab"}
                  type="button"
                  onClick={() => setActiveResultTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <ResultTable activeTab={activeResultTab} />

            <div className="results-subsection reveal">
              <p className="card-kicker">Qualitative evidence</p>
              <h3>UNITE produces consistent class-conditional samples</h3>
            </div>

            <div className="sample-grid">
              {sampleCards.map((card) => (
                <article className="sample-card reveal utility-card" key={card.title}>
                  <div className="sample-frame">
                    <img src={card.image} alt={card.title} loading="lazy" />
                  </div>
                  <h3>{card.title}</h3>
                  <p>{card.body}</p>
                </article>
              ))}
            </div>

            <div className="results-subsection reveal">
              <p className="card-kicker">Practical angle</p>
              <h3>No external teacher, no staged tokenizer pretraining</h3>
            </div>

            <div className="compute-grid">
              <article className="compute-card reveal utility-card">
                <span>No external teacher</span>
                <strong>Train from scratch</strong>
                <p>
                  UNITE avoids the fixed upfront cost of training or importing a
                  DINO-like encoder before latent generation can even begin.
                </p>
              </article>
              <article className="compute-card reveal utility-card">
                <span>Paper claim</span>
                <strong>~15× cheaper than teacher-pretrained routes</strong>
                <p>
                  The draft compares UNITE-B against methods that inherit the
                  cost of DINOv2 pretraining and distillation, framing the
                  method as both cleaner and more transferable across modalities.
                </p>
              </article>
              <article className="compute-card reveal utility-card">
                <span>Beyond ImageNet</span>
                <strong>QM9 match 99.37%</strong>
                <p>
                  The same single-stage formulation extends beyond vision to
                  molecules, where strong pretrained teachers are much less
                  available.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="section" id="analysis">
          <SectionHeading
            kicker="Analysis"
            title="Why the shared encoder works"
            subtitle="UNITE works because tokenization and denoising are already strongly aligned tasks, and weight sharing exploits that alignment rather than fighting it."
          />

          <div className="analysis-grid">
            {analysisCards.map((card) => (
              <article className="analysis-card reveal deep-card" key={card.title}>
                <div className="analysis-image">
                  <img src={card.image} alt={card.title} loading="lazy" />
                </div>
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section resources-section" id="citation">
          <SectionHeading
            kicker="Resources"
            title="Paper, links, and citation"
            subtitle="Direct links first, then a copyable citation block."
          />

          <div className="resource-grid">
            <article className="resource-card reveal deep-card">
              <h3>Project resources</h3>
              <ul className="resource-list">
                {resourceLinks.map((link) => (
                  <li key={link.label}>
                    <a href={link.href}>{link.label}</a>
                  </li>
                ))}
                <li>
                  <span className="muted-link">Code link can be added once public.</span>
                </li>
              </ul>
            </article>

            <article className="resource-card reveal deep-card">
              <div className="citation-head">
                <h3>BibTeX</h3>
                <button className="button dark small" type="button" onClick={copyBibtex}>
                  Copy
                </button>
              </div>
              <pre>{bibtex}</pre>
            </article>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
