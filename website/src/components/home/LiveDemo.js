// Homepage demo: a small Drona-style form that fills in the real WordCount job script
// (website/examples/word-count) as you type. It mirrors what the example's map.json and utils.py
// do, in the browser, so visitors can see the idea without a cluster.
import React, { useState } from 'react';
import Link from '@docusaurus/Link';
import CodeBlock from '@theme/CodeBlock';
import template from '@site/examples/word-count/jobscripts/word-count.slurm';
import styles from './home.module.css';

const RUNS = '/scratch/user/you/drona_wfe/runs';
const CODE_URL =
  'https://github.com/tamu-edu/dor-hprc-drona-composer/tree/master/website/examples/word-count';

// The same checks and messages as check_input, check_top_n and build_filter in utils.py
function generate({ jobName, inputFile, topN, filterShort, minLength, memory, hours }) {
  const messages = [];
  if (!inputFile.trim()) messages.push({ type: 'error', text: 'Choose a text file to analyze.' });
  const count = topN === '' ? 10 : Number(topN);
  if (count > 100) messages.push({ type: 'warning', text: `You asked for ${count} words. The report may be long.` });
  const length = minLength === '' ? 4 : Number(minLength);
  const name = jobName.trim() || 'my-wordcount';
  const hh = String(Math.max(1, Number(hours) || 2)).padStart(2, '0');

  const values = {
    JOBNAME: name,
    TIME: `${hh}:00:00`,
    MEM: `${Number(memory) || 2}G`,
    TASKS: '1',
    CPUS: '1',
    PARTITION: '',
    EXTRA: '',
    flocation: `${RUNS}/${name}`,
    INPUT_FILE: inputFile,
    FILTER: filterShort ? `| awk 'length($0) >= ${length}'` : '',
    TOP_N: String(count),
  };
  const script = (typeof template === 'string' ? template : template.default)
    .split('\n')
    // Placeholders that come out empty here would leave blank or dangling lines; skip them
    .filter((line) => {
      const placeholderOnly = line.match(/^\s*\[(PARTITION|EXTRA|FILTER)\]\s*\\?$/);
      return !placeholderOnly || values[placeholderOnly[1]];
    })
    .join('\n')
    .replace(/\[([A-Za-z_]+)\]/g, (match, key) => (key in values ? values[key] : match))
    .trimEnd();
  return { script, messages };
}

function Field({ label, children, hint }) {
  return (
    <label className={styles.demoField}>
      <span className={styles.demoLabel}>{label}</span>
      {children}
      {hint && <span className={styles.demoHint}>{hint}</span>}
    </label>
  );
}

export default function LiveDemo() {
  const [form, setForm] = useState({
    jobName: '',
    inputFile: '/scratch/user/you/books/moby-dick.txt',
    topN: '10',
    filterShort: true,
    minLength: '4',
    memory: '2',
    hours: '1',
  });
  const set = (key) => (event) =>
    setForm({ ...form, [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value });
  const { script, messages } = generate(form);

  return (
    <section className={styles.section}>
      <div className="container">
        <h2 className={styles.sectionTitle}>Try the WordCount Demo Environment</h2>
        <p className={styles.sectionLead}>
          Fill in the form from the <Link to="/docs/tutorial">WordCount tutorial</Link> and watch Drona
          write the job script for you, right in your browser. Nothing is sent to a cluster, so experiment
          freely.
        </p>
        <div className={styles.demo}>
          <form className={styles.demoForm} onSubmit={(e) => e.preventDefault()}>
            <Field label="Job name" hint="Leave empty and Drona picks one">
              <input type="text" value={form.jobName} placeholder="my-wordcount" onChange={set('jobName')} />
            </Field>
            <Field label="Text file">
              <input type="text" value={form.inputFile} onChange={set('inputFile')} />
            </Field>
            <Field label="Words to report">
              <input type="number" min="1" value={form.topN} onChange={set('topN')} />
            </Field>
            <label className={styles.demoCheck}>
              <input type="checkbox" checked={form.filterShort} onChange={set('filterShort')} />
              Ignore short words
            </label>
            {form.filterShort && (
              <Field label="Minimum word length">
                <input type="number" min="1" value={form.minLength} onChange={set('minLength')} />
              </Field>
            )}
            <div className={styles.demoRow}>
              <Field label="Memory (GB)">
                <input type="number" min="1" value={form.memory} onChange={set('memory')} />
              </Field>
              <Field label="Run time (hours)">
                <input type="number" min="1" value={form.hours} onChange={set('hours')} />
              </Field>
            </div>
          </form>
          <div className={styles.demoWindow}>
            <div className={styles.demoWindowBar}>
              <span>Generated Scripts</span>
              <span className={styles.demoTab}>Job Script (demo)</span>
            </div>
            {messages.length > 0 && (
              <ul className={styles.demoMessages}>
                {messages.map((m) => (
                  <li key={m.text} className={m.type === 'error' ? styles.demoError : styles.demoWarning}>
                    <strong>{m.type === 'error' ? 'Error' : 'Warning'}:</strong> {m.text}
                  </li>
                ))}
              </ul>
            )}
            <CodeBlock language="bash" className={styles.demoCode}>
              {script}
            </CodeBlock>
          </div>
        </div>
        <p className={styles.demoNote}>
          Ask for more than 100 words, or clear the file name, to see how Drona warns you. On your cluster,
          one click on <strong>Run</strong> would submit this job. The tutorial shows you how to get there.
        </p>
        <div className={styles.demoActions}>
          <Link className="button button--primary" to="/docs/tutorial">
            Build It in the Tutorial
          </Link>
          <Link className="button button--outline button--primary" href={CODE_URL}>
            See the Code on GitHub
          </Link>
        </div>
      </div>
    </section>
  );
}
