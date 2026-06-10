import React, { useMemo, useState } from "react";

const DEFAULT_ICON = "🧩";

function EnvironmentFilmstrip({
  environments = [],
  selectedEnvironment,
  onSelectEnvironment,
  onAddEnvironment,
}) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredEnvironments = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    if (!term) return environments;

    return environments.filter((env) => {
      const name = env.env || env.value || env.label || "";
      return name.toLowerCase().includes(term);
    });
  }, [environments, searchTerm]);

  const systemEnvs = filteredEnvironments.filter((env) => !env.is_user_env);
  const userEnvs = filteredEnvironments.filter((env) => env.is_user_env);

  const renderEnvTile = (env) => {
    const name = env.env || env.value || env.label;
    const isSelected =
      selectedEnvironment?.env === name ||
      selectedEnvironment?.value === name;

    const isUserEnv = env.is_user_env;

    return (
      <button
        key={`${isUserEnv ? "user" : "system"}-${name}`}
        type="button"
        className={[
          "env-tile",
          isSelected ? "selected" : "",
          isUserEnv ? "user-env" : "system-env",
        ].join(" ")}
        onClick={() => {
          const option = {
            value: name,
            label: name,
            env: name,
            src: env.src,
            icon: env.icon,
            is_user_env: env.is_user_env,
          };

          onSelectEnvironment("runtime", option);
        }}
      >
        <div className="env-icon">{env.icon || DEFAULT_ICON}</div>
        <div className="env-name">{name}</div>
      </button>
    );
  };

  return (
    <div className="env-filmstrip-shell">
      <input
        type="text"
        className="env-search"
        placeholder="Search envs..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <div className="env-filmstrip-scroll">
        <div className="env-filmstrip">
          {systemEnvs.length > 0 && (
            <>
              <div className="env-section-label">System Envs</div>
              {systemEnvs.map(renderEnvTile)}
            </>
          )}

          {userEnvs.length > 0 && (
            <>
              <div className="env-section-label">User Envs</div>
              {userEnvs.map(renderEnvTile)}
            </>
          )}

          {systemEnvs.length === 0 && userEnvs.length === 0 && (
            <div className="env-empty">No environments found.</div>
          )}

          <button
            type="button"
            className="env-tile env-add"
            onClick={onAddEnvironment}
          >
            <div className="env-icon">+</div>
            <div className="env-name">Import</div>
          </button>
        </div>
      </div>
    </div>
  );
}

export default EnvironmentFilmstrip;