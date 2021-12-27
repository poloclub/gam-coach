<script>
  // @ts-check
  import '../../typedef';
  import d3 from '../../utils/d3-import';
  import { bindInlineSVG } from '../../utils/utils';
  import { onMount } from 'svelte';
  import { bookmarkConfigStore, constraintRatingFormConfigStore,
    constraintsStore } from '../../store';
  import { Constraints } from '../coach/Coach';

  import closeIcon from '../../img/icon-close.svg';
  import easyIcon from '../../img/icon-easy.svg';
  import veryEasyIcon from '../../img/icon-very-easy.svg';
  import neutralIcon from '../../img/icon-neutral.svg';
  import hardIcon from '../../img/icon-hard.svg';
  import veryHardIcon from '../../img/icon-very-hard.svg';
  import lockIcon from '../../img/icon-lock.svg';

  // Component bindings
  let component = null;
  const formatter = d3.format(',.2~f');

  const difficultyMap = {
    'very-hard': ['Very hard to change', veryHardIcon],
    'hard': ['Hard to change', hardIcon],
    'neutral': ['Default', neutralIcon],
    'easy': ['Easy to change', easyIcon],
    'very-easy': ['Very easy to change', veryEasyIcon],
    'lock': ['Impossible to change', lockIcon],
  };

  /// Set up the stores
  /** @type {ConstraintRatingFormConfig} */
  let constraintRatingFormConfig = null;

  /** @type {Object.<string, any>}*/
  const constraintRatingMap = {};
  let emptyReason = '';

  /** @type {Constraints} */
  let constraints = null;
  let constraintList = [];

  constraintsStore.subscribe(value => {
    constraints = value;
  });

  /**
   * Get a list of user specified constraints
   * @param {Constraints} constraints
   */
  const getConstraintList = (constraints) => {
    const constraintList = [];
    if (constraints === null) return [];

    constraints.acceptableRanges.forEach((acceptableRange, featureName) => {
      if (!(featureName === 'earliest_cr_line')) {
      // if (true) {
        constraintList.push ({
          featureName,
          acceptableRange
        });
      }
    });

    const existingFeatures = new Set(constraintList.map(d => d.featureName));

    constraints.difficulties.forEach((difficulty, featureName) => {
      let skipCur = false;
      if (featureName === 'delinq_2yrs' && difficulty === 'very-hard') {
        skipCur = true;
      }
      if (featureName === 'pub_rec' && difficulty === 'very-hard') {
        skipCur = true;
      }
      if (featureName === 'pub_rec_bankruptcies' && difficulty === 'very-hard') {
        skipCur = true;
      }

      if (!skipCur) {
        // This feature is already added
        if (existingFeatures.has(featureName)) {
          constraintList.filter(d => d.featureName === featureName)[0]
            .difficulty = difficulty;
        } else {
          constraintList.push({
            featureName,
            difficulty
          });
        }
      }
    });

    // Translate values to readable texts
    constraintList.forEach((c, i) => {
      // Translate feature name to display name
      constraintList[i].displayName = constraints.allFeatureDisplayNames[
        constraints.allFeatureNames.indexOf(c.featureName)
      ];

      // Translate the acceptable range of categorical features
      if (constraints.labelEncoder[c.featureName] !== undefined &&
        c.acceptableRange !== undefined
      ) {
        constraintList[i].acceptableRangeText = JSON
          .stringify(c.acceptableRange.map(
            d => constraints.labelEncoder[c.featureName][d])
          );
      }

      // Translate the acceptable range of cont features that use transform
      if (constraints.labelEncoder[c.featureName] === undefined &&
        constraints.allFeatureTransforms[
          constraints.allFeatureNames.indexOf(c.featureName)] === 'log10'
      ) {
        constraintList[i].acceptableRangeText = `From ${
          Math.pow(10, c.acceptableRange[0])
        } to ${
          Math.pow(10, c.acceptableRange[1])
        }`;
      }

      // Translate the acceptable range of cont features that do not use transform
      if (constraints.labelEncoder[c.featureName] === undefined &&
        constraints.allFeatureTransforms[
          constraints.allFeatureNames.indexOf(c.featureName)] === null
      ) {
        constraintList[i].acceptableRangeText = `From ${
          c.acceptableRange[0]
        } to ${
          c.acceptableRange[1]
        }`;
      }

      // Initialize the rating map
      constraintRatingMap[c.featureName] = {
        difficulty: '0',
        acceptableRange: '0'
      };
    });

    return constraintList;
  };

  constraintRatingFormConfigStore.subscribe(value => {
    constraintRatingFormConfig = value;

    if (constraintRatingFormConfig.show) {
      constraintList = getConstraintList(constraints);
      console.log(constraintList);
    }
  });

  const cancelClicked = () => {
    constraintRatingFormConfig.show = false;
    constraintRatingFormConfigStore.set(constraintRatingFormConfig);
  };

  const confirmClicked = () => {
    // if (!canSubmit(bookmarkConfig, planRatingsMap)) {
    //   return;
    // }

    // Convert local ratings to store
    constraintRatingFormConfig.constraintRatings = [];

    Object.keys(constraintRatingMap).forEach(featureName => {
      /** @type {ConstraintRating} */
      const constraintRating = {
        featureName,
        difficultyRating: constraintRatingMap[featureName].difficulty,
        rangeRating: constraintRatingMap[featureName].acceptableRange,
        emptyReason: ''
      };
      constraintRatingFormConfig.constraintRatings.push(constraintRating);
    });

    if (emptyReason !== '') {
      constraintRatingFormConfig.constraintRatings.push( {
        featureName: '',
        difficultyRating: '0',
        rangeRating: '0',
        emptyReason: emptyReason
      });
    }

    // Tell the parent that all plans are rated
    constraintRatingFormConfig.action = 'proceed';
    constraintRatingFormConfig.show = false;
    constraintRatingFormConfigStore.set(constraintRatingFormConfig);
  };

  onMount(() => {
    const iconList = [
      { class: 'icon-close', svg: closeIcon }
    ];
    bindInlineSVG(component, iconList);

    setTimeout(() => {
      constraintRatingFormConfig.show = true;
      constraintRatingFormConfigStore.set(constraintRatingFormConfig);
      console.log(constraints);
    }, 1000);
  });

</script>

<style lang="scss">
  @import './ConstraintRatingForm.scss';
</style>

<div class='input-form-back'
  class:no-display={!constraintRatingFormConfig.show}
>
</div>

<div class='input-form'
  tabIndex='0'
  bind:this={component}
  class:no-display={!constraintRatingFormConfig.show}
>

  <div class='header'>
    <span class='title'>Review Your Preferences</span>

    <div class='svg-icon icon-close'
      on:click={() => cancelClicked()}
    ></div>
  </div>

  <div class='content'>
    {#if constraintList.length === 0}
      <span>
        You <strong>did not</strong> set any preferences (difficulty or acceptable range of features). It means
        that all features have the same difficulty for you to change, and GAM Coach
        can suggest any feature value for you.
      </span>

      <label for='empty-reason'>Explain why setting preferences is not helpful or necessary in your case.</label>
      <textarea id='empty-reason' placeholder='I did not set any preferences, because...'
        bind:value={emptyReason}
      ></textarea>

    {:else}

      {#each constraintList as constraint}
        <div class='constraint-row'>
          <div class='constraint-name'>
            {constraint.displayName}
          </div>

          {#if constraint.difficulty !== undefined}
            <div class='constraint-item'>
              <div class='constraint-item-name difficulty'>
                Difficulty: <span class='svg-icon'>{@html difficultyMap[constraint.difficulty][1]}</span>
                {difficultyMap[constraint.difficulty][0]}
              </div>
              <div class='constraint-rating'>
                <select class='rating-select' bind:value={constraintRatingMap[constraint.featureName].difficulty}>
                  <option value='0'>Select an Importance Score</option>
                  <option value='1'>1 - Somewhat Important</option>
                  <option value='2'>2 - Fairly Important</option>
                  <option value='3'>3 - Very Important</option>
                </select>
              </div>
            </div>
          {/if}

          {#if constraint.acceptableRange !== undefined}
            <div class='constraint-item'>
              <div class='constraint-item-name'>
                Acceptable range: {constraint.acceptableRangeText}
              </div>
              <div class='constraint-rating'>
                <select class='rating-select' bind:value={constraintRatingMap[constraint.featureName].acceptableRange}>
                  <option value='0'>Select an Importance Score</option>
                  <option value='1'>1 - Somewhat Important</option>
                  <option value='2'>2 - Fairly Important</option>
                  <option value='3'>3 - Very Important</option>
                </select>
              </div>
            </div>
          {/if}

        </div>
      {/each}

    {/if}
  </div>

  <div class='control'>

    <div class='error-message' class:out-range={true}>
      Complete all fields to proceed
    </div>

    <div class='button button-cancel'
      on:click={() => cancelClicked()}
    >
      Cancel
    </div>

    <div class='button button-confirm'
      class:out-range={true}
      on:click={() => confirmClicked()}
    >
      Next
    </div>

  </div>
</div>