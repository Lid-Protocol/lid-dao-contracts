import { ethers } from "@nomiclabs/buidler";
import { exec } from "child_process";

async function main() {
  const factory = await ethers.getContract("LidDaoTemplate");

  // We got the variables from: https://github.com/aragon/deployments/tree/master/environments/rinkeby
  const ENS = "0x98df287b6c145399aaa709692c8d308357bc085d";
  const DAOFactory = "0x89d87269527495ac29648376d4154ba55c4872fc";
  const aragonID = "0x3665e7bfd4d3254ae7796779800f5b603c43c60d";
  const LidVotingRights = "0x7F2012cE693f2fF98A8888A514b8E6243E69aC86"; // mocked for the moment
  // If we had constructor arguments, they would be passed into deploy()
  let contract = await factory.deploy(
    LidVotingRights,
    DAOFactory,
    ENS,
    aragonID
  );
  // The address the Contract WILL have once mined
  console.log("Contract at address: " + contract.address);

  // The transaction that was sent to the network to deploy the Contract
  console.log("Tx hash: " + contract.deployTransaction.hash);

  // The contract is NOT deployed yet; we must wait until it is mined
  await contract.deployed();
  exec(
    `npx buidler verify-contract --contract-name LidDaoTemplate --address ${contract.address}`
  );
  await contract.functions.newInstance("mysuperDAO", [
    50,
    5,
    60 * 60 * 24,
  ]);
}

main()
.then(() => process.exit(0))
.catch((error) => {
  console.error(error);
  process.exit(1);
});
            
