const { getENS, getTemplateAddress } = require('@aragon/templates-shared/lib/ens')(web3, artifacts)
const { getEventArgument } = require('@aragon/test-helpers/events')
const { assertRole, assertMissingRole, assertRoleNotGranted } = require('@aragon/templates-shared/helpers/assertRole')(web3)

const { setupLidEnv } = require('./helpers/setupLidEnv')
const { APP_IDS } = require('./helpers/apps')
const { getInstalledAppsById } = require('./helpers/events')(artifacts)
// const { getENS, getTemplateAddress } = require('./lib/ens')(web3, artifacts)

const time = require('./helpers/time')(web3)

const LidDaoTemplate = artifacts.require('LidDaoTemplate')
const Kernel = artifacts.require('Kernel')
const ACL = artifacts.require('Acl')
const Agent = artifacts.require('Agent')
const Voting = artifacts.require('Voting')
const LidVotingRightsGrantee = artifacts.require('LidVotingRightsGrantee')

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
    const acl = ACL.at(await dao.acl())


    assert.equal(
      dao.address,
      getEventArgument(receipt, 'SetupDao', 'dao'),
      'should have emitted a SetupDao event'
    )

    // Lets check apps!
    const apps = getInstalledAppsById(receipt);
    console.log(apps)
    assert.equal(apps.agent.length, 1, 'show have installed agent app')
    const agent = Agent.at(apps.agent[0])
    assert.equal(apps.voting.length, 1, 'show have installed voting app')
    const voting = Voting.at(apps.voting[0])
    // assert.equal(apps['lidvotingrightsgrantee'][0].length, 1, 'show have installed lidvotingrightsgrantee app')
    // const vrGrantee = LidVotingRightsGrantee.at(apps.lidvotingrightsgrantee[0])

    // Voting app correctly set up async
    assert.isTrue(await voting.hasInitialized(), 'voting not initialized')
    assert.equal((await voting.supportRequiredPct()).toString(), 50e16)
    assert.equal((await voting.minAcceptQuorumPct()).toString(), 5e16)
    assert.equal((await voting.voteTime()).toString(), time.duration.days(2))
    // await assertRole(acl, voting, voting, 'CREATE_VOTES_ROLE', vrGrantee)
    // await assertRole(acl, voting, vrGrantee, 'MODIFY_QUORUM_ROLE')
    // await assertRole(acl, voting, vrGrantee, 'MODIFY_SUPPORT_ROLE')


    // Agent app correctly set up
    assert.isTrue(await agent.hasInitialized(), 'agent not initialized')
    assert.equal(await agent.designatedSigner(), '0x'.padEnd(42, '0'))
    assert.equal(await dao.recoveryVaultAppId(), APP_IDS.agent, 'agent app is not being used as the vault app of the DAO')
    assert.equal(web3.toChecksumAddress(await dao.getRecoveryVault()), agent.address, 'agent app is not being used as the vault app of the DAO')
    // await assertRole(acl, agent, vrGrantee, 'EXECUTE_ROLE')
    // await assertRole(acl, agent, vrGrantee, 'RUN_SCRIPT_ROLE')
    await assertMissingRole(acl, agent, 'DESIGNATE_SIGNER_ROLE')
    await assertMissingRole(acl, agent, 'ADD_PRESIGNED_HASH_ROLE')


    // DAO and ACL permissions correctly
    // await assertRole(acl, dao, vrGrantee, 'APP_MANAGER_ROLE')
    // await assertRole(acl, acl, vrGrantee, 'CREATE_PERMISSIONS_ROLE')
    await assertRoleNotGranted(acl, dao, 'APP_MANAGER_ROLE', template)
    await assertRoleNotGranted(acl, acl, 'CREATE_PERMISSIONS_ROLE', template)
    await assertRoleNotGranted(acl, acl, 'CREATE_PERMISSIONS_ROLE', voting)
    await assertRoleNotGranted(acl, acl, 'CREATE_PERMISSIONS_ROLE', voting)
    
  });
});
