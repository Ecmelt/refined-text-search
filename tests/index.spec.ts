/* eslint-env jest */
import { tokenize, match } from '../src/index'

const TEXT = `
Up am intention on dependent questions oh elsewhere september.
No betrayed pleasure possible jointure we in throwing.
And can event rapid any shall woman green.
`

function oneStepMatch(query: string) {
  const tokens = tokenize(query)
  return match(tokens, TEXT)
}

describe('tokenize', () => {
  it('single word', async () => {
    expect(tokenize(' Dependent   ')).toEqual([{ term: 'dependent' }])
  })

  it('multiple words', async () => {
    expect(tokenize('on dependent')).toEqual([{ term: 'on' }, { term: 'dependent' }])
  })

  it('multiple words with lots of spaces', async () => {
    expect(tokenize('   on          dependent       ')).toEqual([
      { term: 'on' },
      { term: 'dependent' },
    ])
  })

  it('single phrase', async () => {
    expect(tokenize('"on dependent"')).toEqual([{ term: 'on dependent' }])
  })

  it('multiple phrases', async () => {
    expect(tokenize('"on dependent" "herp di derp" "flerp"')).toEqual([
      { term: 'on dependent' },
      { term: 'herp di derp' },
      { term: 'flerp' },
    ])
  })

  it('exclude', async () => {
    expect(tokenize('-herp -"herp derp"')).toEqual([
      { term: 'herp', exclude: true },
      { term: 'herp derp', exclude: true },
    ])
  })

  it('exact', async () => {
    expect(tokenize('=herp ="herp derp"')).toEqual([
      { term: 'herp', exact: true },
      { term: 'herp derp', exact: true },
    ])
  })

  it('or', async () => {
    expect(tokenize('herp OR derp flerp')).toEqual([
      { or: true, children: [[{ term: 'herp' }], [{ term: 'derp' }, { term: 'flerp' }]] },
    ])

    expect(tokenize('herp OR derp -flerp')).toEqual([
      {
        or: true,
        children: [[{ term: 'herp' }], [{ term: 'flerp', exclude: true }, { term: 'derp' }]],
      },
    ])

    expect(tokenize('herp OR derp OR flerp')).toEqual([
      {
        or: true,
        children: [[{ term: 'herp' }], [{ term: 'derp' }], [{ term: 'flerp' }]],
      },
    ])

    expect(tokenize('herp OR =derp -flerp')).toEqual([
      {
        or: true,
        children: [
          [{ term: 'herp' }],
          [
            { term: 'flerp', exclude: true },
            { term: 'derp', exact: true },
          ],
        ],
      },
    ])
  })

  it('kitchen sink', async () => {
    expect(tokenize('"Hello World" my dear -"how are you" -horrible oh =that ="is sad"')).toEqual([
      { term: 'how are you', exclude: true },
      { term: 'horrible', exclude: true },
      { term: 'hello world' },
      { term: 'my' },
      { term: 'dear' },
      { term: 'oh' },
      { term: 'that', exact: true },
      { term: 'is sad', exact: true },
    ])
  })
})

describe('match', () => {
  it('single word', async () => {
    expect(oneStepMatch('dependent')).toEqual(true)
    expect(oneStepMatch('up')).toEqual(true)
    expect(oneStepMatch('herp')).toEqual(false)
  })

  it('multiple words', async () => {
    expect(oneStepMatch('dependent pleasure')).toEqual(true)
    expect(oneStepMatch('dependent herp')).toEqual(false)
    expect(oneStepMatch('herp derp')).toEqual(false)
  })

  it('single phrase', async () => {
    expect(oneStepMatch('"dependent questions"')).toEqual(true)
    expect(oneStepMatch('"dependent pleasure"')).toEqual(false)
  })

  it('multiple phrases', async () => {
    expect(oneStepMatch('"dependent questions" "in throwing"')).toEqual(true)
    expect(oneStepMatch('"dependent pleasure" "in throwing"')).toEqual(false)
    expect(oneStepMatch('"dependent pleasure" "in throwing" "shall green"')).toEqual(false)
  })

  it('exclude', async () => {
    expect(oneStepMatch('-herp')).toEqual(true)
    expect(oneStepMatch('-"possible throwing"')).toEqual(true)
    expect(oneStepMatch('-pleasure')).toEqual(false)
    expect(oneStepMatch('-"pleasure possible"')).toEqual(false)
  })

  it('exact', async () => {
    expect(
      oneStepMatch(
        '="Up am intention on dependent questions oh elsewhere september. No betrayed pleasure possible jointure we in throwing. And can event rapid any shall woman green."'
      )
    ).toEqual(true)
    expect(
      oneStepMatch(
        '="Up am intention on dependent questions oh elsewhere september. No betrayed pleasure possible jointure we in throwing. And can event rapid any shall woman green"'
      )
    ).toEqual(false)
    expect(
      oneStepMatch(
        '=Up am intention on dependent questions oh elsewhere september. No betrayed pleasure possible jointure we in throwing. And can event rapid any shall woman green.'
      )
    ).toEqual(false)
  })

  it('or', async () => {
    expect(oneStepMatch('possible OR woman')).toEqual(true)
    expect(oneStepMatch('herp OR derp | intention')).toEqual(true)
    expect(oneStepMatch('herp OR derp')).toEqual(false)

    expect(oneStepMatch('herp OR "any shell"')).toEqual(false)
    expect(oneStepMatch('herp OR "any shall"')).toEqual(true)

    expect(oneStepMatch('-possible OR -woman')).toEqual(false)
    expect(oneStepMatch('herp OR derp | -intention')).toEqual(false)
    expect(oneStepMatch('herp OR -derp')).toEqual(true)
    expect(oneStepMatch('=herp OR -derp')).toEqual(true)
  })

  it('kitchen sink', async () => {
    expect(oneStepMatch('"possible jointure" -"herp derp" -derp woman')).toEqual(true)
    expect(oneStepMatch('-"possible jointure" -"herp derp" -derp woman')).toEqual(false)
    expect(oneStepMatch('"possible jointure" -"herp derp" -derp -woman')).toEqual(false)
    expect(oneStepMatch('"possible jointure" "herp derp" -derp woman')).toEqual(false)
    expect(oneStepMatch('"possible jointure" -"herp derp" derp woman')).toEqual(false)
    expect(oneStepMatch('="possible jointure" -"herp derp" -derp woman')).toEqual(false)
  })
})
