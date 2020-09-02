pragma solidity 0.4.24;

import "@aragon/templates-shared/contracts/BaseTemplate.sol";
import "@1hive/oracle-token-balance/contracts/TokenBalanceOracle.sol";

contract LidDaoTemplate is BaseTemplate {

  string constant private ERROR_BAD_VOTE_SETTINGS = "LID_DAO_BAD_VOTE_SETTINGS";

  bytes32 constant private TOKEN_BALANCE_ORACLE_APP_ID = apmNamehash("token-balance-oracle");

  address constant ANY_ENTITY = address(-1);
  uint8 constant ORACLE_PARAM_ID = 203;
  enum Op { NONE, EQ, NEQ, GT, LT, GTE, LTE, RET, NOT, AND, OR, XOR, IF_ELSE }

  event LidDaoDeployed(
    address dao,
    address acl,
    address lidVotingRights,
    address tokenBalanceOracle,
    address voting,
    address agent
  );

  constructor(
    DAOFactory _daoFactory,
    ENS _ens,
    MiniMeTokenFactory _minimeTokenFactory,
    IFIFSResolvingRegistrar _aragonID
  )
  BaseTemplate(_daoFactory, _ens, _minimeTokenFactory, _aragonID)
  public
  {
    _ensureAragonIdIsValid(_aragonID);
  }

  /**
  * @dev Deploy a Company DAO using a LidStaking token
  * @param _id String with the name for org, will assign `[id].aragonid.eth`
  * @param _lidVotingRights Address of the LID Voting Rights contract
  * @param _minVotingRights Minimum amount of LID Voting Rights required to participate in the DAO
  * @param _votingSettings Array of [supportRequired, minAcceptanceQuorum, voteDuration] to set up the voting app of the organization
  * @param _permissionManager The administrator that's initially granted control over the DAO's permissions
  */
  function newInstance(
    string memory _id,
    MiniMeToken _lidVotingRights,
    uint64 _minVotingRights,
    uint64[3] memory _votingSettings,
    address _permissionManager
  )
  public
  {
    require(_lidVotingRights != address(0), "Invalid LID Voting Rights");

    _validateId(_id);
    _validateVotingSettings(_votingSettings);

    (Kernel dao, ACL acl) = _createDAO();
    (Voting voting, Agent agent, TokenBalanceOracle tokenBalanceOracle) = _setupApps(
      dao, acl, _lidVotingRights, _minVotingRights, _votingSettings, _permissionManager
    );
    _transferRootPermissionsFromTemplateAndFinalizeDAO(dao, _permissionManager);
    _registerID(_id, dao);

    emit LidDaoDeployed(
      address(dao),
      address(acl),
      address(_lidVotingRights),
      address(tokenBalanceOracle),
      address(voting),
      address(agent)
    );
  }

  function _setupApps(
    Kernel _dao,
    ACL _acl,
    MiniMeToken _lidVotingRights,
    uint64 _minVotingRights,
    uint64[3] memory _votingSettings,
    address _permissionManager
  )
  internal
  returns (Voting, Agent, TokenBalanceOracle)
  {
    Agent agent = _installDefaultAgentApp(_dao);
    Voting voting = _installVotingApp(_dao, _lidVotingRights, _votingSettings);
    TokenBalanceOracle tokenBalanceOracle = _installTokenBalanceOracle(_dao, _lidVotingRights, _minVotingRights);

    _setupPermissions(
      _acl,
      agent,
      voting,
      tokenBalanceOracle,
      _permissionManager
    );

    return (voting, agent, tokenBalanceOracle);
  }

  function _installTokenBalanceOracle(
    Kernel _dao,
    MiniMeToken _lidVotingRights,
    uint64 _minVotingRights
  ) internal returns (TokenBalanceOracle) {
    TokenBalanceOracle oracle = TokenBalanceOracle(_registerApp(_dao, TOKEN_BALANCE_ORACLE_APP_ID));
    oracle.initialize(_lidVotingRights, _minVotingRights * (10 ** _lidVotingRights.decimals()));
    return oracle;
  }

  function _setupPermissions(
    ACL _acl,
    Agent _agent,
    Voting _voting,
    TokenBalanceOracle _tokenBalanceOracle,
    address _permissionManager
  )
  internal
  {
    _createAgentPermissions(_acl, _agent, _voting, _permissionManager);
    _createVaultPermissions(_acl, Vault(_agent), _voting, _permissionManager);
    _createEvmScriptsRegistryPermissions(_acl, _voting, _permissionManager);

    // Modified _createVotingPermissions, using the token balance oracle as a grantee
    _acl.createPermission(_voting, _voting, _voting.MODIFY_QUORUM_ROLE(), _permissionManager);
    _acl.createPermission(_voting, _voting, _voting.MODIFY_SUPPORT_ROLE(), _permissionManager);

    // For CREATE_VOTES_ROLE, allow anyone to enact if the oracle says they can
    _acl.createPermission(ANY_ENTITY, _voting, _voting.CREATE_VOTES_ROLE(), address(this));
    _setOracle(_acl, ANY_ENTITY, _voting, _voting.CREATE_VOTES_ROLE(), _tokenBalanceOracle);
    _acl.setPermissionManager(_permissionManager, _voting, _voting.CREATE_VOTES_ROLE());
  }

  function _validateVotingSettings(uint64[3] memory _votingSettings) private pure {
    require(_votingSettings.length == 3, ERROR_BAD_VOTE_SETTINGS);
  }

  function _registerApp(Kernel _dao, bytes32 _appId) private returns (address) {
    address proxy = _dao.newAppInstance(_appId, _latestVersionAppBase(_appId));
    emit InstalledApp(proxy, _appId);

    return proxy;
  }

  // ORACLE FNS
  function _setOracle(ACL _acl, address _who, address _where, bytes32 _what, address _oracle) private {
    uint256[] memory params = new uint256[](1);
    params[0] = _paramsTo256(ORACLE_PARAM_ID, uint8(Op.EQ), uint240(_oracle));

    _acl.grantPermissionP(_who, _where, _what, params);
  }

  function _paramsTo256(uint8 _id,uint8 _op, uint240 _value) private returns (uint256) {
    return (uint256(_id) << 248) + (uint256(_op) << 240) + _value;
  }
}
