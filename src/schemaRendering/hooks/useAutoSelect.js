import { useEffect } from "react";

/**
 * Picks an option for a dynamic choice element once its options have loaded, when the current value
 * is empty or no longer among them.
 *
 * @param {Object} args
 * @param {Array}  args.options - loaded options ({value, label})
 * @param {boolean} args.isEvaluated - true once the retriever has returned at least once
 * @param {boolean|"single"|"first"} [args.mode] - true/"single": only when exactly one option exists;
 *   "first": the first option. Falsy disables.
 * @param {*} args.current - the currently selected option value ("" or undefined when none)
 * @param {Function} args.select - called with the option to select
 */
export function useAutoSelect({ options, isEvaluated, mode, current, select }) {
  useEffect(() => {
    if (!mode || !isEvaluated || options.length === 0) return;
    if (options.some((o) => o.value === current)) return;
    if (mode === "first" || options.length === 1) select(options[0]);
  }, [options, isEvaluated, mode, current]); // eslint-disable-line react-hooks/exhaustive-deps
}
