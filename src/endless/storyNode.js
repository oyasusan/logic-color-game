/**
 * storyNode.js
 * STEP32「Story Scenario Framework」セクション7: Story Node。
 * 状態を持たない純粋なヘルパーモジュールで、2つの責務を持つ。
 *
 * 1. buildScenarioNodes(scenario): Scenario（scenarioData.js）のchapters配列から、
 *    Story Mode内部で実際に1つずつ消化していく「フラットな1本道のNodeシーケンス」を
 *    組み立てる（mapGenerator.jsの`buildNode`と同じ「Data→実行可能なNode」変換の
 *    役割）。Story Modeは「Scenario固定・Layer構成固定」（要求仕様セクション1）のため、
 *    Endless RESEARCHのようなMap分岐生成は行わず、常に1本道になる。
 *
 * 2. AMBIENT_STORY_EVENTS / pickAmbientStoryEvent(): 要求仕様セクション7が指す
 *    「Research Map（Endless RESEARCHの既存Map）に追加するStory Node種別」用の、
 *    特定のCASE Scenarioとは無関係な短い断片イベントのプール。Endless RESEARCHの
 *    世界線とStory Mode各CASEの世界線は独立している（CASE側はScenario固定の
 *    正史、Endless側は無限に繰り返されるRUN）ため、Endless Map上のStory Nodeは
 *    CASEのStoryEventを直接は参照せず、専用のアンビエントな断片のみを表示する。
 */
(function (global) {
  'use strict';

  const G = global.LogicColor = global.LogicColor || {};

  /**
   * @param {Object} scenario scenarioData.jsの1件
   * @returns {Array<Object>} { type:'story'|'puzzle'|'boss', chapterId, chapterTitle,
   *   chapterDescription, chapterObjectives, storyEventId?, directorLine }
   */
  function buildScenarioNodes(scenario) {
    const nodes = [];
    if (!scenario) return nodes;

    scenario.chapters.forEach(chapter => {
      let chapterStarted = false;
      const takeDirectorLine = () => {
        const isFirstNodeOfChapter = !chapterStarted;
        chapterStarted = true;
        return isFirstNodeOfChapter ? (chapter.directorLine || null) : null;
      };

      (chapter.storyEventIds || []).forEach(eventId => {
        nodes.push({
          type: 'story',
          chapterId: chapter.id, chapterTitle: chapter.title,
          chapterDescription: chapter.description, chapterObjectives: chapter.objectives,
          storyEventId: eventId,
          directorLine: takeDirectorLine()
        });
      });

      if (chapter.hasPuzzle) {
        nodes.push({
          type: chapter.isBossChapter ? 'boss' : 'puzzle',
          chapterId: chapter.id, chapterTitle: chapter.title,
          chapterDescription: chapter.description, chapterObjectives: chapter.objectives,
          directorLine: takeDirectorLine()
        });
      }
    });

    return nodes;
  }

  // Endless RESEARCHの既存Research Mapに追加するStory Node（要求仕様セクション7）用の、
  // 特定Scenarioとは無関係な断片イベント。CASEの正史とは異なる「Endless世界線側の
  // 小さな記録の欠片」という位置づけ
  const AMBIENT_STORY_EVENTS = [
    { icon: '💬', title: 'STORY LOG', message: 'この施設には、まだ語られていない記録が残っている。' },
    { icon: '🔍', title: 'STORY LOG', message: '壁面のデータパネルに、消えかけた文字列が浮かんでいる。' },
    { icon: '🧠', title: 'STORY LOG', message: '遠くから、聞き覚えのない機械音声の断片が聞こえた気がした。' },
    { icon: '🎬', title: 'STORY LOG', message: '一瞬、視界に別の施設の映像がノイズのように重なった。' },
    { icon: '📖', title: 'STORY LOG', message: 'この場所は、何度も何度も繰り返されてきたのかもしれない。' },
    { icon: '💬', title: 'STORY LOG', message: '「これは最初の記録ではない」——そう記されたメモを見つけた。' }
  ];

  function pickAmbientStoryEvent() {
    return AMBIENT_STORY_EVENTS[Math.floor(Math.random() * AMBIENT_STORY_EVENTS.length)];
  }

  G.StoryNode = { buildScenarioNodes, AMBIENT_STORY_EVENTS, pickAmbientStoryEvent };
})(typeof globalThis !== 'undefined' ? globalThis : this);
