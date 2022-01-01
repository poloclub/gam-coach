import '../../typedef';
import d3 from '../../utils/d3-import';

/**
 * Update the plan labels with the new plan information
 */
export const InitPlanLabels = (plans, tabInputLabel) => {
  const vowels = ['a', 'e', 'i', 'o', 'u'];
  if (
    plans.isRegression &&
    vowels.includes(plans.regressionName.substring(0, 1))
  ) {
    tabInputLabel = tabInputLabel.replace(' a', ' an');
  } else if (
    !plans.isRegression &&
    vowels.includes(plans.classes[0].substring(0, 1))
  ) {
    tabInputLabel = tabInputLabel.replace(' a', ' an');
  }

  // Set up the plans
  const localPlanLabels = [];
  let curIndex = plans.nextPlanIndex;

  let failTarget = null;
  if (!plans.isRegression) {
    for (let i = 0; i < plans.classes.length; i++) {
      if (i !== plans.classTarget[0]) {
        failTarget = i;
        break;
      }
    }
  }

  for (let i = 0; i < 5; i++) {
    localPlanLabels.push({
      name: `Plan ${curIndex}`,
      planIndex: curIndex,
      isRegression: plans.isRegression,
      score: plans.isRegression ? plans.score : plans.classTarget[0],
      classes: plans.isRegression ? null : plans.classes,
      failTarget: failTarget,
      textWidth: 0
    });
    curIndex++;
  }

  return { tabInputLabel, localPlanLabels };
};

/**
 * Figure out the max width that the score panel can take on the tabs
 */
export const setScorePanelWidth = (component, plans, planLabels) => {
  // Set a fixed width to the tabs element so that its children do not
  // overflow the container. We have to do that because the overflow is set
  // to visible for the tab appearance
  const tabs = d3.select(component).select('.tabs');
  tabs.style('width', `${tabs.node().getBoundingClientRect().width}px`);

  const tab = tabs.select(`.tab-${plans.activePlanIndex}`);

  // Figure out the max width that the score panel can take
  // The way to do that is to use tab width - max plan text width - star width
  const paddingL = parseInt(
    getComputedStyle(tab.node()).getPropertyValue('padding-left')
  );
  const paddingR = parseInt(
    getComputedStyle(tab.node()).getPropertyValue('padding-right')
  );

  const tabWidth =
    tab.node().getBoundingClientRect().width - paddingL - paddingR;

  const star = tab.select('.star-wrapper');
  const starWidth = star.node().getBoundingClientRect().width;

  let maxNameWidth = 0;

  planLabels.forEach((p) => {
    const curTab = d3.select(component).select(`.tab-${p.planIndex}`);
    const nameWidth = curTab
      .select('.tab-name')
      .node()
      .getBoundingClientRect().width;
    if (nameWidth > maxNameWidth) {
      maxNameWidth = nameWidth;
    }
  });

  const scorePanelWidth = Math.floor(tabWidth - maxNameWidth - starWidth) - 4;

  // Compute the text width and pass it to all score panels
  let textWidth = 0;
  // For regression, we set the width to the initial score width
  if (plans.isRegression) {
    const tempText = d3
      .select(component)
      .select('.score-panel')
      .append('span')
      .classed('decision', true)
      .classed('regression', true)
      .style('visibility', 'hidden')
      .text(plans.score);

    textWidth = tempText.node().getBoundingClientRect().width;
    tempText.remove();
  } else {
    // For classification, we iterate through all classes to find the max width
    const tempText = d3
      .select(component)
      .select('.score-panel')
      .append('span')
      .classed('decision', true)
      .style('visibility', 'hidden')
      .text(plans.classes[0]);

    textWidth = tempText.node().getBoundingClientRect().width;

    for (let i = 1; i < plans.classes.length; i++) {
      tempText.text(plans.classes[i]);
      const newWidth = tempText.node().getBoundingClientRect().width;
      textWidth = Math.max(textWidth, newWidth);
    }

    tempText.remove();
  }

  planLabels.forEach((p) => {
    p.textWidth = textWidth;
  });

  return scorePanelWidth;
};
