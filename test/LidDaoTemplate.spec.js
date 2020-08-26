const encodeCall = require('@aragon/templates-shared/helpers/encodeCall')
const { getEventArgument } = require('@aragon/test-helpers/events')
const { getENS, getTemplateAddress } = require('@aragon/templates-shared/lib/ens')(web3, artifacts)

const BN = require('bn.js')
const {expect} = require("chai")

const { loadLidEnvironment } = require('./helpers/VotingRightSetUp')
const { APP_IDS } = require('./helpers/apps')
const { getInstalledAppsById } = require('./helpers/events')(artifacts)

const LidDaoTemplate = artifacts.require('LidDaoTemplate')
const Kernel = artifacts.require('Kernel')
const ACL = artifacts.require('ACL')

const bigExp = (x, y = 0) => new BN(x).mul(new BN(10).pow(new BN(y)));
const pct16 = x => bigExp(x, 16);

contract('LidDaoTemplate', () => {
  let ens, template, lidVotingRight;
  const manager = "0x7F2012cE693f2fF98A8888A514b8E6243E69aC86";

  const VOTING_SETTNGS = [
    bigExp(50, 16), 
    bigExp(5, 16),
    86400
  ]

  before('fetch LidDaoTemplate and ENS', async () => {
    ens = await getENS()
    template = LidDaoTemplate.at(await getTemplateAddress())
    lidVotingRight = await loadLidEnvironment();
    console.log(lidVotingRight)
  });
  
  const createInstance = (...params) => {
    const lastParam = params[params.length - 1];
    const txParams = (!Array.isArray(lastParam) && typeof lastParam === 'object') ? params.pop() : {};
    const newInstanceFn = LidDaoTemplate.abi.find(f => f.name === "newInstance");
    return template.sendTransaction(encodeCall(newInstanceFn, params, txParams));
  }

  it('Create new instance', async () => {
    const receipt = await createInstance(lidVotingRight, "Lid DAO", VOTING_SETTNGS, manager);
    const dao = Kernel.at(getEventArgument(receipt, 'DeployDao', 'dao'))
    assert.equal(dao.address, getEventArgument(receipt, 'SetupDao', 'dao'), 'should have emitted a SetupDao event')
    
    const apps = getInstalledAppsById(receipt);
    assert.equal(apps.agent.length, 1, 'show have installed agent app')
  });

});
