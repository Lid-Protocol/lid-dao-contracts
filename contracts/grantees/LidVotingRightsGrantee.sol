pragma solidity 0.4.24;

import "@aragon/os/contracts/apps/AragonApp.sol";
import "@aragon/os/contracts/common/IForwarder.sol";
import "@aragon/apps-shared-minime/contracts/MiniMeToken.sol";

contract LidVotingRightsGrantee is IForwarder, AragonApp {
  MiniMeToken lidVotingRights;

  string private constant ERROR_CAN_NOT_FORWARD = "LIDVR_CAN_NOT_FORWARD";

  function initialize(MiniMeToken _lidVotingRights) onlyInit external {
    initialized();
    lidVotingRights = _lidVotingRights;
  }

  function isForwarder() external pure returns (bool) {
    return true;
  }

  function canForward(address _sender, bytes) public view returns (bool) {
    return hasInitialized() && lidVotingRights.balanceOf(_sender) > 0;
  }

  function forward(bytes _evmScript) public {
    require(canForward(msg.sender, _evmScript), ERROR_CAN_NOT_FORWARD);

    bytes memory input = new bytes(0);
    address[] memory blacklist = new address[](0);
    runScript(_evmScript, input, blacklist);
  }
}
