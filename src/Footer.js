import React from "react";

function Footer() {
  return (
    <footer className="drona-footer">
      <div className="drona-footer-main">
        <div className="drona-footer-left">
          <strong>Drona Workflow Engine</strong>
          <span className="footer-divider">|</span>
          <span>Developed by the HPRC Fishbowl</span>
        </div>

        <div className="drona-footer-right">
          <a href="mailto:help@hprc.tamu.edu">help@hprc.tamu.edu</a>
          <a href="https://github.com/">GitHub</a>
          <a href="https://github.com/tamu-edu/dor-hprc-drona-composer/graphs/contributors?from=3%2F7%2F2026">Contributors</a>
          <a href="https://forms.gle/W6YxigbbLUVE3YAz7">Feedback/Issues</a>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
