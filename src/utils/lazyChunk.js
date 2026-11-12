import React from "react";

/**
 * React.lazy with a visible failure state. A chunk can fail to download (network drop, or an
 * app update removed the hashed file a page still refers to); without this the rejected import
 * would throw during render and take the whole composer down.
 *
 * @param {Function} load - Returns the dynamic import(), e.g. () => import("./Chart")
 * @param {string} label - What the user is missing, used in the error message
 * @returns {React.LazyExoticComponent} Component to render inside a Suspense boundary
 */
export default function lazyChunk(load, label) {
  return React.lazy(() =>
    load().catch((error) => {
      console.error(`Failed to load ${label}:`, error);
      const LoadFailed = React.forwardRef(() => (
        <div className="alert alert-danger" role="alert">
          Could not load the {label}. Please reload the page.
        </div>
      ));
      return { default: LoadFailed };
    })
  );
}
