const { getENS, getTemplateAddress } = require('@aragon/templates-shared/lib/ens')(web3, artifacts)
const { getEventArgument } = require('@aragon/test-helpers/events')

const { setupLidEnv } = require('./helpers/setupLidEnv')
const time = require('./helpers/time')(web3)

const LidDaoTemplate = artifacts.require('LidDaoTemplate')
const Kernel = artifacts.require('Kernel')

contract('LidDaoTemplate', (accounts) => {
  let ens, template, lidVotingRight, admin

  before('fetch LidDaoTemplate and ENS', async () => {
    ens = await getENS()
    template = LidDaoTemplate.at(await getTemplateAddress())
    lidVotingRight = await setupLidEnv(web3, accounts)
    admin = accounts[0]
  });

  it('Create new instance', async () => {
    const receipt = await template.newInstance(
      "lid",
      lidVotingRight.options.address,
      [50e16, 5e16, time.duration.days(2).toNumber()],
      admin
    )
    const dao = Kernel.at(getEventArgument(receipt, 'DeployDao', 'dao'))

    assert.equal(
      dao.address,
      getEventArgument(receipt, 'SetupDao', 'dao'),
      'should have emitted a SetupDao event'
    )
  });
});
