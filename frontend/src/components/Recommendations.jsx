import { FiCpu, FiCheckCircle, FiChevronRight } from 'react-icons/fi'

function ConfidenceBar({ value }) {
  const pct = Math.round(value * 100)
  const color =
    pct >= 80 ? 'from-green-500 to-emerald-400' :
    pct >= 60 ? 'from-yellow-500 to-amber-400' :
    'from-red-500 to-orange-400'
  return (
    <div className="flex items-center gap-2">
      <div className="confidence-bar-bg flex-1">
        <div className={`confidence-bar bg-gradient-to-r ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono font-semibold text-slate-300 w-10 text-right">{pct}%</span>
    </div>
  )
}

export default function Recommendations({ possibleCauses = [], recommendedSteps = [], overallConfidence }) {
  return (
    <div className="space-y-5 animate-slide-up">
      {/* Possible Causes */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
              <FiCpu className="text-orange-400" size={16} />
            </div>
            <div>
              <h3 className="font-semibold text-white">Possible Causes</h3>
              <p className="text-xs text-slate-400">Ranked by AI confidence</p>
            </div>
          </div>
          {overallConfidence !== undefined && (
            <div className="text-right">
              <p className="text-xs text-slate-500 mb-1">Overall Confidence</p>
              <p className="text-lg font-bold gradient-text">{Math.round(overallConfidence * 100)}%</p>
            </div>
          )}
        </div>

        {possibleCauses.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-4">No cause analysis available.</p>
        ) : (
          <div className="space-y-3">
            {possibleCauses.map((item, i) => (
              <div
                key={i}
                className="bg-surface-elevated border border-surface-border rounded-xl p-4 transition-all hover:border-orange-500/30"
              >
                <div className="flex items-start gap-3 mb-2">
                  <span className={`
                    w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5
                    ${i === 0 ? 'bg-orange-500/30 text-orange-300 border border-orange-500/50' :
                      i === 1 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                      'bg-surface-border text-slate-400 border border-surface-border'}
                  `}>
                    {i + 1}
                  </span>
                  <p className="text-sm text-slate-200 font-medium leading-snug">{item.cause}</p>
                </div>
                <ConfidenceBar value={item.confidence} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recommended Steps */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-green-500/20 border border-green-500/30 flex items-center justify-center">
            <FiCheckCircle className="text-green-400" size={16} />
          </div>
          <div>
            <h3 className="font-semibold text-white">Recommended Steps</h3>
            <p className="text-xs text-slate-400">AI-generated remediation plan</p>
          </div>
        </div>

        {recommendedSteps.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-4">No steps generated.</p>
        ) : (
          <ol className="space-y-2">
            {recommendedSteps.map((step, i) => (
              <li
                key={i}
                className="flex items-start gap-3 bg-surface-elevated border border-surface-border hover:border-green-500/20 rounded-xl p-3 transition-all duration-200 group"
              >
                <FiChevronRight className="text-green-400 flex-shrink-0 mt-0.5 group-hover:translate-x-1 transition-transform" size={16} />
                <span className="text-sm text-slate-300">{step}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}
