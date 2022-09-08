// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IControlContract.sol";
import "releasemanager/contracts/CostManagerFactoryHelper.sol";
import "releasemanager/contracts/ReleaseManagerHelper.sol";

contract ControlContractFactory is CostManagerFactoryHelper, ReleaseManagerHelper{
    using Clones for address;

    /**
    * @custom:shortd controlContract implementation address
    * @notice ControlContract implementation address
    */
    address public immutable controlContractImplementation;

    address[] public instances;
    
    event InstanceCreated(address instance, uint instancesCount);

    /**
    * @param controlContractImpl address of СontrolContract implementation
    * @param costManager address of costManager
    */
    constructor(
        address controlContractImpl,
        address costManager
    ) 
        CostManagerFactoryHelper(costManager)
    {
        controlContractImplementation = controlContractImpl;
    }

    ////////////////////////////////////////////////////////////////////////
    // external section ////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////

    /**
    * @dev view amount of created instances
    * @return amount amount instances
    * @custom:shortd view amount of created instances
    */
    function instancesCount()
        external 
        view 
        returns (uint256 amount) 
    {
        amount = instances.length;
    }

    ////////////////////////////////////////////////////////////////////////
    // public section //////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////

    /**
    * @return instance address of created instance `СontrolContract`
    * @custom:shortd creation СontrolContract instance
    * @param communityAddr community address
    * @param groupRoles tuples of GroupRolesSetting
    */
    function produce(
        address communityAddr,
        IControlContract.GroupRolesSetting[] memory groupRoles
    ) 
        public 
        returns (address instance) 
    {
        
        instance = controlContractImplementation.clone();

        _produce(instance);

        IControlContract(instance).init(communityAddr, groupRoles, costManager, msg.sender);

        Ownable(instance).transferOwnership(msg.sender);
        
    }

    ////////////////////////////////////////////////////////////////////////
    // internal section ////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////

    function _produce(
        address instance
    ) 
        internal
    {
        require(instance != address(0), "ControlContractFactory: INSTANCE_CREATION_FAILED");

        instances.push(instance);
        
        emit InstanceCreated(instance, instances.length);
    }

}