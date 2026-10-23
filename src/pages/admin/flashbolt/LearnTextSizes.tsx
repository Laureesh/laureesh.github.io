import { GROUPS, defaults, type useLearnTextSizes } from "./useLearnTextSizes";

export default function LearnTextSizes({ sizes, setSizes }: Pick<ReturnType<typeof useLearnTextSizes>, "sizes" | "setSizes">) {
  return <section className="options-section learn-text-sizes" aria-labelledby="learn-text-sizes-title">
    <h3 id="learn-text-sizes-title">Text size</h3>
    <p>Adjust groups of text across Learn. Changes save automatically. 100% is the original size.</p>
    {GROUPS.map(([key, label]) => <div className="learn-text-size-row" key={key}>
      <label htmlFor={`learn-size-${key}`}>{label}</label>
      <output htmlFor={`learn-size-${key}`}>{sizes[key]}%</output>
      <input id={`learn-size-${key}`} type="range" min="75" max="200" step="5" value={sizes[key]}
        aria-valuetext={`${sizes[key]} percent${sizes[key] === 100 ? ", default" : ""}`}
        onChange={event => setSizes(current => ({ ...current, [key]: Number(event.target.value) }))} />
    </div>)}
    <button type="button" className="button quiet" onClick={() => setSizes(defaults())}>Reset text sizes</button>
  </section>;
}
