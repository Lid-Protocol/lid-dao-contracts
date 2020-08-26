const encodeCall = require('@aragon/templates-shared/helpers/encodeCall')
const { getENS, getTemplateAddress } = require('@aragon/templates-shared/lib/ens')(web3, artifacts)
const LidDaoTemplate = artifacts.require('LidDaoTemplate')
const {expect} = require("chai")

const { loadLidEnvironment, SECOND_PER_DAY } = require('./helpers/VotingRightSetUp')

contract('LidDaoTemplate', () => {
  let ens, template, lidVotingRight;
  const manager = "0x7F2012cE693f2fF98A8888A514b8E6243E69aC86";

  before('fetch LidDaoTemplate and ENS', async () => {
    ens = await getENS()
    template = LidDaoTemplate.at(await getTemplateAddress())
    lidVotingRight = await loadLidEnvironment();
    console.log(lidVotingRight)
  });
  
  const createInstance = (...params) => {
    const newInstanceFn = LidDaoTemplate.abi.find(f => f.name === "newInstance");
    const lastParam = params[params.length - 1];
    const txParams = (!Array.isArray(lastParam) && typeof lastParam === 'object') ? params.pop() : {};
    return template.sendTransaction(encodeCall(newInstanceFn, lastParams, txParams));
  }

  it('Create new instance', () => {
    createInstance(lidVotingRight.address, "amazingDAOhuehue", [50, 5, SECOND_PER_DAY * 2], manager);
  });
  
});
