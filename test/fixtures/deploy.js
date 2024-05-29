const { time, loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

async function deployBase() {
    
    // Setup accounts.
    const [
        owner, alice, bob, charlie, david, eve,
    ] = await ethers.getSigners();

    const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
    const DEAD_ADDRESS = '0x000000000000000000000000000000000000dEaD';
    const NO_COSTMANAGER = ZERO_ADDRESS;
    const WITHOUT_DELAY = 0n;
    const WITH_DELAY = 65000n;  //max 2**16 = 65536

    const ReleaseManagerFactoryF = await ethers.getContractFactory("MockReleaseManagerFactory");
    const CostManagerGoodF = await ethers.getContractFactory("MockCostManagerGood");
    const CostManagerBadF = await ethers.getContractFactory("MockCostManagerBad");

    const ReleaseManagerF = await ethers.getContractFactory("MockReleaseManager");
    
    const ControlContractFactoryF = await ethers.getContractFactory("ControlContractFactory");    
    const ControlContractF = await ethers.getContractFactory("ControlContractMock");    
    const CommunityMockF = await ethers.getContractFactory("CommunityMock");    

    const rolesTitle = new Map([
      ['owners', 'owners'],
      ['admins', 'admins'],
      ['members', 'members'],
      ['relayers', 'relayers'],
      ['role1', 'Role#1'],
      ['role2', 'Role#2'],
      ['role3', 'Role#3'],
      ['role4', 'Role#4'],
      ['role5', 'Role#5'],
      ['cc_admins', 'AdMiNs'],
      ['sub-admins', 'sub-admins'],
      ['group1_can_invoke', 'group1_can_invoke'],
      ['group1_can_endorse', 'group1_can_endorse'],
      ['group2_can_invoke', 'group2_can_invoke'],
      ['group2_can_endorse', 'group2_can_endorse']
    ]);
   
    const rolesIndex = new Map([
      ['owners', 1],
      ['admins', 2],
      ['members', 3],
      ['relayers', 4],
      ['role1', 5],
      ['role2', 6],
      ['role3', 7],
      ['role4', 9],
      ['role5', 10],
      ['cc_admins', 11],
      ['sub-admins', 12],
      ['group1_can_invoke', 13],
      ['group1_can_endorse', 14],
      ['group2_can_invoke', 15],
      ['group2_can_endorse', 16]
      
    ]);

    const CostManagerGood = await CostManagerGoodF.deploy();
    const CostManagerBad = await CostManagerBadF.deploy();
    const SomeExternalMockF = await ethers.getContractFactory("SomeExternalMock");
    const SomeExternalMock = await SomeExternalMockF.connect(owner).deploy();

    const ERC20MintableF = await ethers.getContractFactory("ERC20Mintable");
    const ERC20Mintable = await ERC20MintableF.connect(owner).deploy();

    let implementationReleaseManager    = await ReleaseManagerF.deploy();
    let releaseManagerFactory   = await ReleaseManagerFactoryF.connect(owner).deploy(implementationReleaseManager.target);
    //
    let tx = await releaseManagerFactory.connect(owner).produce();
    let rc = await tx.wait(); // 0ms, as tx is already confirmed
    let event = rc.logs.find(event => event.fragment.name === 'InstanceProduced');
    let instance;
    [instance, /*instancesCount*/] = event.args;

    let releaseManager = await ethers.getContractAt("MockReleaseManager",instance);

    var ControlContractImpl = await ControlContractF.connect(owner).deploy();
    
    const CommunityMock = await CommunityMockF.connect(owner).deploy();
    const ControlContractFactory = await ControlContractFactoryF.connect(owner).deploy(ControlContractImpl.target, NO_COSTMANAGER, releaseManager.target);

    // 
    const factoriesList = [ControlContractFactory.target];
    const factoryInfo = [
        [
            1,//uint8 factoryIndex; 
            1,//uint16 releaseTag; 
            "0x53696c766572000000000000000000000000000000000000"//bytes24 factoryChangeNotes;
        ]
    ];

    await releaseManager.connect(owner).newRelease(factoriesList, factoryInfo);

    return {
        owner, alice, bob, charlie, david, eve,
        ZERO_ADDRESS,
        DEAD_ADDRESS,
        NO_COSTMANAGER,
        WITHOUT_DELAY,
        WITH_DELAY,
        rolesTitle,
        rolesIndex,

        ReleaseManagerFactoryF,
        CostManagerGoodF,
        CostManagerBadF,
        ReleaseManagerF,
        ControlContractFactoryF,
        ControlContractF,
        CommunityMockF,
        SomeExternalMockF,
        ERC20MintableF,
        
        ERC20Mintable,
        SomeExternalMock,
        CommunityMock,
        ControlContractFactory,
        CostManagerGood,
        CostManagerBad
    }
}

async function deployWithoutDelay() {
    const res = await loadFixture(deployBase);
    const {
        owner,
        alice,
        bob,
        charlie,
        rolesIndex,
        WITHOUT_DELAY,
        ControlContractFactory,
        CommunityMock
    } = res;

    let instance;
                //
    let tx = await ControlContractFactory.connect(owner).produce(CommunityMock.target, [[rolesIndex.get('sub-admins'),rolesIndex.get('members')]], WITHOUT_DELAY);
    let rc = await tx.wait(); // 0ms, as tx is already confirmed
    
    let event = rc.logs.find(event => event.fragment.name === 'InstanceCreated');
    
    [instance, ] = event.args;
    const ControlContract = await ethers.getContractAt("ControlContractMock",instance);

    await CommunityMock.setRoles(alice.address, [rolesIndex.get('sub-admins')]);
    await CommunityMock.setRoles(bob.address, [rolesIndex.get('members')]);
    await CommunityMock.setRoles(charlie.address, [rolesIndex.get('members')]);

    return {...res, ...{
        ControlContract
    }}
}
async function deployWithDelay() {
    const res = await loadFixture(deployBase);
    const {
        owner,
        alice,
        bob,
        charlie,
        rolesIndex,
        WITH_DELAY,
        ControlContractFactory,
        CommunityMock
    } = res;

    let instance;
                //
    let tx = await ControlContractFactory.connect(owner).produce(CommunityMock.target, [[rolesIndex.get('sub-admins'),rolesIndex.get('members')]], WITH_DELAY);
    let rc = await tx.wait(); // 0ms, as tx is already confirmed
    let event = rc.logs.find(event => event.fragment.name === 'InstanceCreated');
    [instance, ] = event.args;
    const ControlContract = await ethers.getContractAt("ControlContractMock",instance);

    await CommunityMock.setRoles(alice.address, [rolesIndex.get('sub-admins')]);
    await CommunityMock.setRoles(bob.address, [rolesIndex.get('members')]);
    await CommunityMock.setRoles(charlie.address, [rolesIndex.get('members')]);
    
    return {...res, ...{
        ControlContract
    }}
}

module.exports = {
  deployBase,
  deployWithoutDelay,
  deployWithDelay
}