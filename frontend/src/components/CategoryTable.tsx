import React, { useState } from 'react';
import type { AnalysisCategory } from '../types/index';

interface CategoryTableProps {
  categoryId: string;
  category: AnalysisCategory;
  onEvidenceClick?: (evidence: string) => void;
}

const CategoryTable: React.FC<CategoryTableProps> = ({
  categoryId,
  category,
  onEvidenceClick,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getEvaluationBadge = (evaluation: number) => {
    if (evaluation === 1) {
      return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">ポジティブ</span>;
    } else if (evaluation === -1) {
      return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded">ネガティブ</span>;
    } else {
      return <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded">言及なし</span>;
    }
  };

  const cleanEvidence = (evidence: string) => {
    // Remove 【「 and 」と発言】
    return evidence.replace(/【「(.+?)」と発言】/g, '$1');
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden mb-4">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <svg
              className={`w-5 h-5 text-gray-600 transition-transform ${isExpanded ? 'transform rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-800">
              {categoryId}：{category.name}
            </h3>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">ポジティブ:</span>
            <span className="font-semibold text-green-600">{category.positiveCount}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">ネガティブ:</span>
            <span className="font-semibold text-red-600">{category.negativeCount}</span>
          </div>
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                    評価
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    項目
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    根拠
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {category.items
                  .filter((item) => item.evaluation !== 0)
                  .map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getEvaluationBadge(item.evaluation)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{item.item}</div>
                      </td>
                      <td className="px-6 py-4">
                        {item.evidence !== '言及なし' ? (
                          <button
                            onClick={() => onEvidenceClick?.(item.evidence)}
                            className="text-sm text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer text-left transition-colors"
                          >
                            {cleanEvidence(item.evidence)}
                          </button>
                        ) : (
                          <span className="text-sm text-gray-500">{item.evidence}</span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryTable;
