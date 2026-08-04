/**
 * storyEndingManager.js
 * STEP32「Story Scenario Framework」セクション11: Ending System。
 * Scenarioごとの`ending`配列（scenarioData.js）から、そのRUNでの選択履歴に
 * 応じた1件を決定するだけの、状態を持たない純粋な評価モジュール
 * （protocolUnlock.js/storyUnlockManager.jsと同じ「静的オブジェクト」設計）。
 * 実際の永続化（endingHistory/scenarioClearData）はscenarioManager.js経由で
 * endlessSave.jsへ委譲する（このモジュール自身は何も保存しない）。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  /**
   * @param {Object} condition ending定義の`condition`
   * @param {Array<{eventId:string, choiceId:string}>} choiceHistory 該当Scenarioでの選択履歴
   * @returns {boolean}
   */
  function matchesCondition(condition, choiceHistory) {
    if (!condition) return false;
    if (condition.type === 'choice') {
      return (choiceHistory || []).some(c => c.eventId === condition.eventId && c.choiceId === condition.value);
    }
    return false;
  }

  /**
   * @param {Object} scenario scenarioData.jsの1件
   * @param {Array<{eventId:string, choiceId:string}>} choiceHistory getChoiceHistory(scenarioId)相当
   * @returns {Object|null} 決定したEnding定義（conditionを満たすものを優先し、無ければcondition:nullのものを採用）
   */
  function determineEnding(scenario, choiceHistory) {
    if (!scenario || !Array.isArray(scenario.ending) || scenario.ending.length === 0) return null;
    const matched = scenario.ending.find(e => matchesCondition(e.condition, choiceHistory));
    if (matched) return matched;
    return scenario.ending.find(e => !e.condition) || scenario.ending[0];
  }

  G.StoryEndingManager = { matchesCondition, determineEnding };
})(typeof globalThis !== 'undefined' ? globalThis : this);
