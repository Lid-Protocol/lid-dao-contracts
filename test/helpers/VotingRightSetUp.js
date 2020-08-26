const { encodeCall } = require("@openzeppelin/upgrades");
const { accounts, contract } = require("@openzeppelin/test-environment");
const { expectRevert, time, BN, ether, balance } = require("@openzeppelin/test-helpers");

const AdminUpgradeabilityProxyABI = require("@openzeppelin/upgrades/build/contracts/AdminUpgradeabilityProxy.json");
const ProxyAdminABI = require("@openzeppelin/upgrades/build/contracts/ProxyAdmin.json");
const LidTokenABI = require("lid-contracts/build/contracts/LidToken.json");
const LidStakingABI = require("lid-contracts/build/contracts/LidStaking.json");
const LidStakingV2ABI = require("lid-contracts/build/contracts/LidStakingV2.json");
const LidCertifiedPresaleABI = require("lid-contracts/build/contracts/LidCertifiedPresale.json");
const LidDaoFundABI = require("lid-contracts/build/contracts/LidDaoLock.json");
const LidVotingRightABI = require("lid-contracts/build/contracts/LidVotingRights.json");

const lidConfig = require("lid-contracts/config");

const AdminUpgradeabilityProxy = contract.fromABI(AdminUpgradeabilityProxyABI.abi, AdminUpgradeabilityProxyABI.bytecode);
const ProxyAdmin = contract.fromABI(ProxyAdminABI.abi, ProxyAdminABI.bytecode);

const LidToken = contract.fromABI(LidTokenABI.abi, LidTokenABI.bytecode);
const LidStaking = contract.fromABI(LidStakingABI.abi, LidStakingABI.bytecode);
const LidStakingV2 = contract.fromABI(LidStakingV2ABI.abi, LidStakingV2ABI.bytecode);
const LidCertifiedPresale = contract.fromABI(LidCertifiedPresaleABI.abi, LidCertifiedPresaleABI.bytecode);
const LidDaoFund = contract.fromABI(LidDaoFundABI.abi, LidDaoFundABI.bytecode);

const LidVotingRight = contract.fromABI(LidVotingRightABI.abi, LidVotingRightABI.bytecode);

const SECONDS_PER_DAY = 86400;
const loadLidEnvironment = async () => {
  let staked = {}
  let history = {}
  let totalStaked = new BN(0)
  let totalStakedHistory = []

  const tokenParams = {
    name: "Lidbar Network",
    symbol: "LID",
    decimals: 18,
    taxBP: 190,
    daoTaxBP: 10
  };

  const stakingParams = {
    stakingTaxBP: 0,
    unstakingTaxBP: 200,
    startTime: 1596322800,
    registrationFeeWithReferrer: ether("400"),
    registrationFeeWithoutReferrer: ether("200")
  };



  const owner = accounts[0];
  const stakers = [accounts[1], accounts[2], accounts[3], accounts[4]];
  const nonstaker = accounts[5];
  const distributionAccount = accounts[8];

  // Create the token instance
  let lidToken = await LidToken.new();

  // Stand up an upgradeable LidStaking instance
  let lidStakingLogic = await LidStaking.new();
  let lidStakingAdmin = await ProxyAdmin.new({ from: owner });
  let lidStaking = await AdminUpgradeabilityProxy.new(
    lidStakingLogic.address,
    lidStakingAdmin.address,
    encodeCall(
      "initialize",
      ["uint256", "uint256", "uint256", "uint256", "address", "address"],
      [
        stakingParams.stakingTaxBP.toString(),
        stakingParams.unstakingTaxBP.toString(),
        stakingParams.registrationFeeWithReferrer.toString(),
        stakingParams.registrationFeeWithoutReferrer.toString(),
        owner,
        lidToken.address
      ]
    )
  );


  // "cast" lidStaking to a LidStaking contract
  lidStaking = contract.fromABI(LidStakingABI.abi, LidStakingABI.bytecode, lidStaking.address);

  lidCertifiedPresale = await LidCertifiedPresale.new();
  lidDaoFund = await LidDaoFund.new();

  await lidToken.initialize(
    tokenParams.name,
    tokenParams.symbol,
    tokenParams.decimals,
    owner,
    tokenParams.taxBP,
    tokenParams.daoTaxBP,
    lidDaoFund.address,
    lidStaking.address,
    lidCertifiedPresale.address
  );

  await Promise.all([
    await lidToken.mint(stakers[0], ether("100000"), { from: owner }),
    await lidToken.mint(stakers[1], ether("100000"), { from: owner }),
    await lidToken.mint(stakers[2], ether("100000"), { from: owner }),
    await lidToken.mint(stakers[3], ether("100000"), { from: owner }),
    await lidToken.mint(nonstaker, ether("100000"), { from: owner }),
    await lidToken.mint(distributionAccount, ether("130000"), { from: owner })
  ]);

  await lidToken.setIsTransfersActive(true, { from: owner });
  await lidToken.setIsTaxActive(true, { from: owner });

  await time.advanceBlock();
  let latest = await time.latest();

  await lidStaking.setStartTime(latest.add(new BN(SECONDS_PER_DAY)), { from: owner });

  // Start the staking period
  await time.advanceBlock();
  latest = await time.latest();
  await time.increase(SECONDS_PER_DAY * 30);

  // Have all the stakers send an initial stake + registration
  for (const staker of stakers) {
    const value = ether("21000");
    await lidStaking.registerAndStake(value, { from: staker });

    if (!staked[staker]) {
      staked[staker] = new BN(0);
    }

    const tax = await lidStaking.stakingTaxBP();
    const taxAmount = await lidStaking.findTaxAmount(value, tax);
    const regFee = await lidStaking.registrationFeeWithoutReferrer();
    const result = value.sub(taxAmount).sub(regFee);
    staked[staker] = staked[staker].add(result);
    totalStaked = totalStaked.add(result);
  }


  const lidStakingLogicV2 = await LidStakingV2.new()

  await lidStakingAdmin.upgrade(lidStaking.address, lidStakingLogicV2.address, { from: owner });

  lidStaking = contract.fromABI(LidStakingV2ABI.abi, LidStakingV2ABI.bytecode, lidStaking.address);

  await lidStaking.v2Initialize(lidToken.address, { from: owner });

  // const lidVotingRight = await LidVotingRight.new();

  // await lidVotingRight.initialize(lidStaking.address, lidToken.address);


  return "0x61FfE691821291D02E9Ba5D33098ADcee71a3a17";
};

module.exports = {
  SECONDS_PER_DAY,
  loadLidEnvironment
};
