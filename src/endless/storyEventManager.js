/**
 * storyEventManager.js
 * STEP32「Story Scenario Framework」セクション6: Story Event System。
 * DIALOGUE/DISCOVERY/MEMORY/CHOICE/CINEMATICの5種のStory Event
 * （scenarioData.jsの`storyEvents`配列）を取得し、CHOICE型で選ばれた
 * 選択肢をchoiceHistoryへ記録するだけの、状態を持たない薄いCoordinator。
 * 実際の描画（オーバーレイ表示）はstoryMode.js側の責務。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};
  const { ScenarioData } = G;

  class StoryEventManager {
    /** @param {Object} deps @param {Object} deps.save EndlessSaveStoreインスタンス */
    constructor({ save }) {
      this.save = save;
    }

    /** @returns {Object|null} 指定Scenario内の指定Story Event定義 */
    getEvent(scenarioId, eventId) {
      return ScenarioData.getStoryEvent(scenarioId, eventId);
    }

    /**
     * CHOICE型Story Eventで選ばれた選択肢を記録する。
     * @param {string} scenarioId @param {string} eventId @param {string} choiceId
     */
    recordChoice(scenarioId, eventId, choiceId) {
      this.save.recordChoice(scenarioId, eventId, choiceId);
    }

    /** @returns {Array<Object>} 指定Scenarioでこれまでに選んだ選択肢の履歴（古い順） */
    getChoiceHistory(scenarioId) {
      return this.save.getChoiceHistoryForScenario(scenarioId);
    }

    /** @returns {string|null} 指定Story Eventで選んだ選択肢id（複数回挑戦時は最新のもの。未選択ならnull） */
    getChoiceFor(scenarioId, eventId) {
      const history = this.getChoiceHistory(scenarioId).filter(c => c.eventId === eventId);
      return history.length > 0 ? history[history.length - 1].choiceId : null;
    }
  }

  G.StoryEventManager = StoryEventManager;
})(typeof globalThis !== 'undefined' ? globalThis : this);
