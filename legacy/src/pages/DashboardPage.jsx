import { useEffect, useState } from "react";
import { groupRequests } from "../utils/requestGroups";
import { apiFetch } from "../utils/api";

function DashboardPage({
  UPDATES_PER_PAGE,
  allRequests,
  loadingRequests,
  page,
  pendingRequests,
  selectPage,
  setActiveManagementTab,
  setActiveReportTab,
  setSelectedRequest,
  setShowAddStockPopup,
  setUpdatesPage,
  stats,
  totalUpdatePages,
  updatesPage,
  visibleUpdateRequests,
}) {
  const pendingRequestCount = groupRequests(pendingRequests).length;

  // Chart analytics state: 'daily' | 'weekly' | 'monthly'
  const [timeframe, setTimeframe] = useState("weekly");
  const [metricMode, setMetricMode] = useState("all"); // 'all' | 'stock' | 'requests'
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoadingAnalytics(true);
      const res = await apiFetch("get_chart_analytics.php");
      const data = await res.json();
      if (data.success) {
        setAnalyticsData(data);
      }
    } catch (err) {
      console.error("Failed to load chart analytics:", err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // Extract active points based on timeframe
  const activePoints =
    timeframe === "daily"
      ? analyticsData?.daily || []
      : timeframe === "weekly"
      ? analyticsData?.weekly || []
      : analyticsData?.monthly || [];

  // Compute maximum value for dynamic Y-axis scaling
  const maxStock = Math.max(
    ...activePoints.map((p) => Number(p.items_in_stock) || 0),
    10
  );
  const maxReq = Math.max(
    ...activePoints.map((p) => Number(p.total_requests) || 0),
    5
  );
  const maxUnits = Math.max(
    ...activePoints.map((p) => Number(p.units_requested) || 0),
    5
  );

  return <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">{page.eyebrow}</p>
                  <h1>Inventory monitoring</h1>
                  <p className="page-description">{page.description}</p>
                </div>
                <div className="btn-group">
                  <button
                    className="secondary-button"
                    onClick={() => {
                      if (setActiveReportTab) setActiveReportTab("claim");
                      selectPage("reports");
                    }}
                  >
                    Manage Requests
                  </button>

                  <button
                    className="primary-button"
                    onClick={() => {
                      selectPage("projects");
                      setActiveManagementTab("stock");
                      setShowAddStockPopup(true);
                    }}
                  >
                    <span>+</span> Add inventory
                  </button>
                </div>
              </div>

              {/*stats grid*/}

              <div className="stats-grid">
                <article className="stat-card">
                  <span className="stat-icon">◈</span>
                  <p>Low stock items</p>
                  <strong>{stats.lowStock}</strong>
                  <small>
                    <b>Inventory</b> currently low
                  </small>
                </article>

                <article className="stat-card">
                  <span className="stat-icon green">↗</span>
                  <p>Items in stock</p>
                  <strong>{stats.inStock}</strong>
                  <small>
                    <b>Inventory</b> currently available
                  </small>
                </article>

                <article className="stat-card">
                  <span className="stat-icon orange">◒</span>
                  <p>Pending requests</p>
                  <strong>{pendingRequestCount}</strong>
                  <small>
                    <b>Awaiting</b> approval
                  </small>
                </article>
              </div>

              {/*content grid and chart*/}

              <div className="content-grid">
                <article className="panel chart-panel real-chart-panel">
                  <div className="panel-heading">
                    <div>
                      <p className="panel-kicker">Real-time Activity</p>
                      <h2>Inventory & Request Analytics</h2>
                    </div>

                    <div className="chart-controls-header">
                      {/* Timeframe Switcher */}
                      <div className="timeframe-toggle-group">
                        <button
                          type="button"
                          className={`timeframe-btn ${timeframe === "daily" ? "active" : ""}`}
                          onClick={() => setTimeframe("daily")}
                        >
                          Daily (7D)
                        </button>
                        <button
                          type="button"
                          className={`timeframe-btn ${timeframe === "weekly" ? "active" : ""}`}
                          onClick={() => setTimeframe("weekly")}
                        >
                          Weekly (4W)
                        </button>
                        <button
                          type="button"
                          className={`timeframe-btn ${timeframe === "monthly" ? "active" : ""}`}
                          onClick={() => setTimeframe("monthly")}
                        >
                          Monthly (6M)
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Summary Metric Strip */}
                  <div className="chart-kpi-strip">
                    <div className="chart-kpi-item stock">
                      <span className="dot dot-stock" />
                      <div className="kpi-info">
                        <span className="kpi-label">Items in Stock</span>
                        <strong className="kpi-val">
                          {analyticsData?.summary?.total_stock_units ?? stats.inStock} units
                        </strong>
                      </div>
                    </div>

                    <div className="chart-kpi-item requests">
                      <span className="dot dot-req" />
                      <div className="kpi-info">
                        <span className="kpi-label" style={{color: 'red'}} >Total Requests</span>
                        <strong className="kpi-val">
                          {analyticsData?.summary?.total_requests ?? 0}
                        </strong>
                      </div>
                    </div>

                    <div className="chart-kpi-item completed">
                      <span className="dot dot-completed" />
                      <div className="kpi-info">
                        <span className="kpi-label">Completed</span>
                        <strong className="kpi-val">
                          {analyticsData?.summary?.completed_requests ?? 0}
                        </strong>
                      </div>
                    </div>

                    <div className="chart-kpi-item pending">
                      <span className="dot dot-pending" />
                      <div className="kpi-info">
                        <span className="kpi-label">Pending</span>
                        <strong className="kpi-val">
                          {analyticsData?.summary?.pending_requests ?? pendingRequestCount}
                        </strong>
                      </div>
                    </div>

                    <div className="chart-kpi-item approved">
                      <span className="dot dot-approved" />
                      <div className="kpi-info">
                        <span className="kpi-label">Approved (Claimable)</span>
                        <strong className="kpi-val">
                          {analyticsData?.summary?.approved_requests ?? 0}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Chart Body: Multi-series Line Chart */}
                  {loadingAnalytics ? (
                    <div className="chart-loading-state">
                      <div className="spinner-loader" style={{ width: 28, height: 28 }} />
                      <span>Loading inventory & requests data...</span>
                    </div>
                  ) : activePoints.length === 0 ? (
                    <div className="chart-loading-state">
                      <span>No activity recorded for this period.</span>
                    </div>
                  ) : (() => {
                    const W = 620;
                    const H = 220;
                    const padX = 40;
                    const padY = 25;
                    const plotW = W - padX * 2;
                    const plotH = H - padY * 2;
                    const n = activePoints.length;

                    // Compute maximum for Y-axis scaling
                    const maxVal = Math.max(
                      ...activePoints.map((p) => Number(p.items_in_stock) || 0),
                      ...activePoints.map((p) => Number(p.total_requests) || 0),
                      10
                    );

                    // Round up Y ceiling to nice round number
                    const yCeil = Math.ceil(maxVal / 50) * 50 || 100;
                    const yTicks = [
                      yCeil,
                      Math.round(yCeil * 0.75),
                      Math.round(yCeil * 0.5),
                      Math.round(yCeil * 0.25),
                      0,
                    ];

                    // Helper to compute coordinates
                    const getX = (idx) =>
                      n <= 1 ? padX + plotW / 2 : padX + (idx / (n - 1)) * plotW;
                    const getY = (val) =>
                      padY + plotH - ((Number(val) || 0) / (yCeil || 1)) * plotH;

                    // Build smooth or straight SVG path
                    const makeLinePath = (getter) => {
                      return activePoints
                        .map((pt, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getY(getter(pt))}`)
                        .join(" ");
                    };

                    const makeAreaPath = (getter) => {
                      const line = makeLinePath(getter);
                      const lastX = getX(n - 1);
                      const firstX = getX(0);
                      const base = padY + plotH;
                      return `${line} L ${lastX} ${base} L ${firstX} ${base} Z`;
                    };

                    const pathStock = makeLinePath((p) => p.items_in_stock);
                    const areaStock = makeAreaPath((p) => p.items_in_stock);

                    const pathTotalReq = makeLinePath((p) => p.total_requests);
                    const pathCompleted = makeLinePath((p) => p.completed);
                    const pathPending = makeLinePath((p) => p.pending);

                    return (
                      <div className="real-chart-container line-chart-container">
                        <div className="line-chart-svg-box">
                          {/* Y-axis Labels */}
                          <div className="line-chart-y-axis">
                            {yTicks.map((tick, i) => (
                              <span key={i}>{tick}</span>
                            ))}
                          </div>

                          <div className="line-chart-svg-wrapper">
                            <svg
                              viewBox={`0 0 ${W} ${H}`}
                              className="line-chart-svg"
                              preserveAspectRatio="none"
                            >
                              <defs>
                                <linearGradient id="stockAreaGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.32" />
                                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.01" />
                                </linearGradient>
                                <linearGradient id="reqAreaGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
                                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0.01" />
                                </linearGradient>
                              </defs>

                              {/* Horizontal Grid lines */}
                              {yTicks.map((tick, i) => {
                                const yPos = padY + (i / (yTicks.length - 1)) * plotH;
                                return (
                                  <line
                                    key={i}
                                    x1={padX}
                                    y1={yPos}
                                    x2={padX + plotW}
                                    y2={yPos}
                                    stroke="#e8edf4"
                                    strokeDasharray="4 4"
                                    strokeWidth="1"
                                  />
                                );
                              })}

                              {/* 1. Items in Stock Area & Line */}
                              <path d={areaStock} fill="url(#stockAreaGrad)" />
                              <path
                                d={pathStock}
                                fill="none"
                                stroke="#3b82f6"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />

                              {/* 2. Total Requests Line */}
                              <path
                                d={pathTotalReq}
                                fill="none"
                                stroke="#ef4444"
                                strokeWidth="2.5"
                                strokeDasharray="5 3"
                                strokeLinecap="round"
                              />

                              {/* 3. Completed Requests Line */}
                              <path
                                d={pathCompleted}
                                fill="none"
                                stroke="#10b981"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                              />

                              {/* 4. Pending Requests Line */}
                              <path
                                d={pathPending}
                                fill="none"
                                stroke="#f59e0b"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                              />

                              {/* Interactive Point Markers */}
                              {activePoints.map((pt, i) => {
                                const x = getX(i);
                                const yS = getY(pt.items_in_stock);
                                const yC = getY(pt.completed);
                                const yP = getY(pt.pending);
                                const yR = getY(pt.total_requests);

                                return (
                                  <g key={i} className="line-point-group">
                                    {/* Stock circle */}
                                    <circle
                                      cx={x}
                                      cy={yS}
                                      r="4.5"
                                      fill="#ffffff"
                                      stroke="#3b82f6"
                                      strokeWidth="2.5"
                                      className="line-point-circle"
                                    >
                                      <title>{`${pt.label || pt.date}: ${pt.items_in_stock} items in stock`}</title>
                                    </circle>

                                    {/* Request circle */}
                                    {pt.total_requests > 0 && (
                                      <circle
                                        cx={x}
                                        cy={yR}
                                        r="4"
                                        fill="#ffffff"
                                        stroke="#ef4444"
                                        strokeWidth="2"
                                        className="line-point-circle"
                                      >
                                        <title>{`${pt.label || pt.date}: ${pt.total_requests} total requests (${pt.completed} completed, ${pt.pending} pending)`}</title>
                                      </circle>
                                    )}

                                    {/* Completed circle */}
                                    {pt.completed > 0 && (
                                      <circle
                                        cx={x}
                                        cy={yC}
                                        r="3.5"
                                        fill="#10b981"
                                        stroke="#ffffff"
                                        strokeWidth="1.5"
                                        className="line-point-circle"
                                      >
                                        <title>{`Completed: ${pt.completed}`}</title>
                                      </circle>
                                    )}

                                    {/* Pending circle */}
                                    {pt.pending > 0 && (
                                      <circle
                                        cx={x}
                                        cy={yP}
                                        r="3.5"
                                        fill="#f59e0b"
                                        stroke="#ffffff"
                                        strokeWidth="1.5"
                                        className="line-point-circle"
                                      >
                                        <title>{`Pending: ${pt.pending}`}</title>
                                      </circle>
                                    )}
                                  </g>
                                );
                              })}
                            </svg>

                            {/* X-axis labels */}
                            <div className="line-chart-x-axis">
                              {activePoints.map((pt, i) => (
                                <span
                                  key={i}
                                  className="line-x-label"
                                  title={pt.label || pt.range || pt.date}
                                >
                                  {pt.short || pt.label || pt.date}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Chart Legends */}
                        <div className="chart-legends-footer">
                          <div className="legend-item">
                            <span className="legend-line-indicator line-stock" />
                            <span>Items in Stock</span>
                          </div>
                          <div className="legend-item">
                            <span className="legend-line-indicator line-req" />
                            <span style={{color: 'red'}}>Total Requests</span>
                          </div>
                          <div className="legend-item">
                            <span className="legend-line-indicator line-completed" />
                            <span>Completed Requests</span>
                          </div>
                          <div className="legend-item">
                            <span className="legend-line-indicator line-pending" />
                            <span>Pending Requests</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </article>
                {/*recent updates*/}

                <article className="panel updates-panel">
                  <div className="panel-heading">
                    <div>
                      <p className="panel-kicker">Requests</p>
                      <h2>Request update</h2>
                    </div>

                    <button
                      className="text-button"
                      onClick={() => selectPage("activity")}
                    >
                      View all <span>→</span>
                    </button>
                  </div>

                  <div className="update-list">
                    {loadingRequests ? (
                      <div className="update-item">
                        <div>
                          <p>Loading requests...</p>
                        </div>
                      </div>
                    ) : visibleUpdateRequests.length === 0 ? (
                      <div className="update-item">
                        <div>
                          <strong>No requests</strong>
                          <p>There are currently no requests.</p>
                        </div>
                      </div>
                    ) : (
                      visibleUpdateRequests.map((request) => (
                        <div
                          className="update-item"
                          key={`${request.request_type}-${request.id}`}
                          onClick={() => {
                            setSelectedRequest(request);
                            selectPage("reports");
                          }}
                          style={{ cursor: "pointer" }}
                        >
                          <div className="update-avatar blue">
                            {request.user_name
                              ? request.user_name.charAt(0).toUpperCase()
                              : "U"}
                          </div>

                          <div>
                            <strong>
                              {request.user_name || "Unknown user"}{" "}
                              <span>
                                {request.request_type === "account_permission"
                                  ? "requested account permission"
                                  : "requested an item"}
                              </span>
                            </strong>

                            {request.request_type === "account_permission" ? (
                              <p>
                                Account permission ·{" "}
                                {request.permission ||
                                  request.role ||
                                  "Permission request"}
                              </p>
                            ) : (
                              <p>
                                {request.item_name || "Unknown item"} ·{" "}
                                {request.amount || 0} requested
                              </p>
                            )}

                            <small>
                              {request.created_at
                                ? new Date(request.created_at).toLocaleString()
                                : "Recently"}
                            </small>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {allRequests.length > UPDATES_PER_PAGE && (
                    <div className="update-pagination">
                      <button
                        type="button"
                        className="pagination-button"
                        onClick={() =>
                          setUpdatesPage((page) => Math.max(1, page - 1))
                        }
                        disabled={updatesPage === 1}
                      >
                        Back
                      </button>

                      <span>
                        {updatesPage} / {totalUpdatePages}
                      </span>

                      <button
                        type="button"
                        className="pagination-button"
                        onClick={() =>
                          setUpdatesPage((page) =>
                            Math.min(totalUpdatePages, page + 1),
                          )
                        }
                        disabled={updatesPage === totalUpdatePages}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </article>
              </div>
            </>;
}

export default DashboardPage;
