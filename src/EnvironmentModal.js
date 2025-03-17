import React, { useState, useEffect } from 'react';

const EnvironmentModal = ({ envModalRef, onAddEnvironment }) => {
  const [environments, setEnvironments] = useState([]);
  const [filteredEnvironments, setFilteredEnvironments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [organizationFilter, setOrganizationFilter] = useState('');
  const [categories, setCategories] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const modal = envModalRef?.current;
    if (!modal) return;

    const handleModalShow = () => {
      loadEnvironments();
    };

    modal.addEventListener('show.bs.modal', handleModalShow);
    modal.addEventListener('shown.bs.modal', handleModalShow);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class' &&
            modal.classList.contains('show')) {
          loadEnvironments();
        }
      });
    });

    observer.observe(modal, { attributes: true });

    return () => {
      modal.removeEventListener('show.bs.modal', handleModalShow);
      modal.removeEventListener('shown.bs.modal', handleModalShow);
      observer.disconnect();
    };
  }, [envModalRef]);

  useEffect(() => {
    if (!environments.length) return;

    const filtered = environments.filter(env => {
      const matchesSearch = (env.env || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (env.description || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === '' || env.category === categoryFilter;
      const matchesOrganization = organizationFilter === '' || env.organization === organizationFilter;

      return matchesSearch && matchesCategory && matchesOrganization;
    });

    setFilteredEnvironments(filtered);
  }, [searchTerm, categoryFilter, organizationFilter, environments]);

  const loadEnvironments = () => {
    setIsLoading(true);

    const url = document.dashboard_url + "/jobs/composer/get_more_envs_info";
    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (!Array.isArray(data)) {
          setIsLoading(false);
          return;
        }

        setEnvironments(data);
        setFilteredEnvironments(data);

        const uniqueCategories = [...new Set(data.map(env => env.category).filter(Boolean))];
        const uniqueOrganizations = [...new Set(data.map(env => env.organization).filter(Boolean))];
        
        setCategories(uniqueCategories);
        setOrganizations(uniqueOrganizations);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching environment data:", error);
        setIsLoading(false);
      });
  };

  const handleAddEnvironment = (env) => {
    const formData = new FormData();
    formData.append("env", env.env);
    formData.append("src", env.src);

    return fetch(document.dashboard_url + "/jobs/composer/add_environment", {
      method: "POST",
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.status === "Success") {
          const newEnv = {
            value: env.env,
            label: env.env,
            src: env.src,
            styles: { color: "#3B71CA" },
          };
          onAddEnvironment && onAddEnvironment(newEnv);
          return { success: true };
        } else {
          return { success: false, message: data.message || "Unknown error" };
        }
      });
  };

  const resetFilters = () => {
    setSearchTerm('');
    setCategoryFilter('');
    setOrganizationFilter('');
  };

  return (
    <div ref={envModalRef} className="modal fade bd-example-modal-lg" id="env-add-modal" tabIndex="-1" role="dialog" aria-hidden="true">
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Import Environments</h5>
            <button type="button" className="close" data-dismiss="modal" aria-label="Close">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div className="modal-body">
            <div className="row mb-3">
              <div className="col-md-6">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search environments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="col-md-3">
                <select
                  className="form-control"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-3">
                <select
                  className="form-control"
                  value={organizationFilter}
                  onChange={(e) => setOrganizationFilter(e.target.value)}
                >
                  <option value="">All Organizations</option>
                  {organizations.map(org => (
                    <option key={org} value={org}>{org}</option>
                  ))}
                </select>
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-4">
                <div className="spinner-border text-primary" role="status">
                  <span className="sr-only">Loading...</span>
                </div>
                <p className="mt-2">Loading environments...</p>
              </div>
            ) : (
              <>
                {filteredEnvironments.length === 0 ? (
                  <div className="alert alert-info">
                    No environments found matching your filters.
                    <button className="btn btn-link" onClick={resetFilters}>Reset filters</button>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-striped table-bordered">
                      <thead>
                        <tr>
                          <th>Environment</th>
                          <th>Description</th>
                          <th>Category</th>
                          <th>Organization</th>
                          <th>Version</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredEnvironments.map((env, index) => (
                          <tr key={index}>
                            <td>{env.env}</td>
                            <td>{env.description}</td>
                            <td>{env.category || 'N/A'}</td>
                            <td>{env.organization || 'N/A'}</td>
                            <td>{env.version || 'N/A'}</td>
                            <td>
                              <AddEnvironmentButton
                                env={env}
                                onAddEnvironment={handleAddEnvironment}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="mt-2 text-muted small">
                  Showing {filteredEnvironments.length} of {environments.length} environments
                </div>
              </>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" data-dismiss="modal">Close</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const AddEnvironmentButton = ({ env, onAddEnvironment }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  const handleClick = () => {
    if (isAdded) return;

    setIsAdding(true);
    onAddEnvironment(env)
      .then(result => {
        setIsAdding(false);
        if (result.success) {
          setIsAdded(true);
        } else {
          alert("Error adding environment: " + result.message);
        }
      })
      .catch(error => {
        setIsAdding(false);
        console.error("Error adding environment:", error);
        alert("Error adding environment. See console for details.");
      });
  };

  if (isAdding) {
    return (
      <button className="btn btn-primary btn-sm" disabled>
        <span className="spinner-border spinner-border-sm mr-1" role="status" aria-hidden="true"></span>
        Adding...
      </button>
    );
  }

  if (isAdded) {
    return (
      <button className="btn btn-success btn-sm" disabled>
        Added ✓
      </button>
    );
  }

  return (
    <button className="btn btn-primary btn-sm" onClick={handleClick}>
      Add
    </button>
  );
};

export default EnvironmentModal;
