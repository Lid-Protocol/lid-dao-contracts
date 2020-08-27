const { hash: namehash } = require('eth-ens-namehash')

const APPS = [
  { name: 'agent', contractName: 'Agent' },
  { name: 'voting', contractName: 'Voting' },
  { name: 'lidvotingrightsgrantee', contractName: 'LidVotingRightsGrantee' },
]

const APP_IDS = APPS.reduce((ids, { name }) => {
  ids[name] = namehash(`${name}.aragonpm.eth`)
  return ids
}, {})

module.exports = {
  APPS,
  APP_IDS
}