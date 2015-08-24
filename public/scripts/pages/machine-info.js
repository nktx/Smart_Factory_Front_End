'use strict';

var $ = window.jQuery = require('jquery');
var _ = require('lodash');
var header = require('../includes/header');
var api = require('../machine/api');
var queryParameter = require('../lib/helper/query-parameter');

var noticeedPersonDropdown = require('../machine/modules/noticed-person-dropdown');
var checkPeriodDropdown    = require('../machine/modules/check-period-dropdown');
var maintainPeriodDropdown = require('../machine/modules/maintain-period-dropdown');

var checkRecordTable    = require('../machine/modules/check-record-table');
var maintainRecordTable = require('../machine/modules/maintain-record-table');
var errorRecordTable    = require('../machine/modules/error-record-table');


/* DOM */
var $editBtn   = $('#machine-edit-button');
var $cancelBtn = $('#machine-cancel-button');
var $saveBtn   = $('#machine-save-button');
var $deleteBtn = $('#machine-delete-button');
var $backBtn   = $('#machine-back-button');
var $machineDetailPage  = $('#machine-detail-page');
var $viewModeCollection = $machineDetailPage.find('.view-mode');
var $editModeCollection = $machineDetailPage.find('.edit-mode');

var $serialNumber = $('#machine-serial-num');
var $name = $('#machine-name');
var $weight = $('#machine-weight');
// TODO: 機台稼動率
var $noticeedPersonName = $('#machine-noticed-person').find('.view-mode');
var noticedId;
var userList;


var isEditMode   = false;
var isCreateMode = false;
var machineId;
var originalData;
var hasSaveChangedData  = false;
var hasSaveNewRecord    = false;
var hasSaveDeleteRecord = false;
var hasSaveNewData      = false;


initialize();

function initialize() {
	header.include();
	if (queryParameter.get('new') === 'true') {
		isCreateMode = true;
		showCreateMode();
	}
	machineId = queryParameter.get('ID');
	api.setFactoryId(queryParameter.get('factoryId'));
	getInitialData();
	bindEvents();

	noticeedPersonDropdown.init();
	checkRecordTable.init();
	maintainRecordTable.init();
	errorRecordTable.init();
}

function getInitialData() {
	if (!machineId) return;
	api.getMachineInfo(machineId)
		 .done(initialView)
		 .fail(function(err) { console.log("GET Machine Info error: ", err); });

	api.getUserList()
		.done(initialNoticedName)
		.fail(function(err) { console.log('initialNoticedName GET user list error:', err) });
}

function bindEvents() {
	$editBtn  .on('click', showEditMode);
	$cancelBtn.on('click', hideEditMode);
	$deleteBtn.on('click', deleteMachine);
	$backBtn  .on('click', api.goToMachineIndex);
	$machineDetailPage.on('keypress', 'input', preventSubmitOnInputEnter);
	$machineDetailPage.submit(saveData);
}

function showEditMode() {
	isEditMode = true;
	$editBtn  .hide();
	$cancelBtn.show();
	$saveBtn  .show();
	$deleteBtn.hide();
	$backBtn  .hide();
	$viewModeCollection.addClass('editting');
	$editModeCollection.addClass('editting');
	checkRecordTable.setEditMode(true);
	maintainRecordTable.setEditMode(true);
	errorRecordTable.setEditMode(true);
}

function hideEditMode() {
	isEditMode = false;
	resetViewData();
	$editBtn  .show();
	$cancelBtn.hide();
	$saveBtn  .hide();
	$deleteBtn.show();
	$backBtn  .show();
	$viewModeCollection.removeClass('editting');
	$editModeCollection.removeClass('editting');
	checkRecordTable.setEditMode(false);
	maintainRecordTable.setEditMode(false);
	errorRecordTable.setEditMode(false);
}

function showCreateMode() {
	$editBtn  .hide();
	$cancelBtn.hide();
	$saveBtn  .show();
	$deleteBtn.hide();
	$backBtn  .show();
	$viewModeCollection.addClass('creating');
	$editModeCollection.addClass('creating');
	checkRecordTable.setEditMode(true);
	maintainRecordTable.setEditMode(true);
	errorRecordTable.setEditMode(true);
	checkPeriodDropdown.setDefaultType();
	maintainPeriodDropdown.setDefaultType();
	noticeedPersonDropdown.setDefault();
}

function preventSubmitOnInputEnter(e) {
	var code = e.keyCode || e.which;
	if (code === 13) {
	  e.preventDefault();
	  return false;
	}
}

function saveData() {
	if (isEditMode && !isCreateMode) {
		saveChangedData();
		saveNewRecord();
		saveDeleteRecord();

	} else if (!isEditMode && isCreateMode) {
		saveNewData();
		saveNewRecord();

	} else {
		console.log('machine info page has error: Undefined Mode');
	}
}

function saveChangedData() {
	hasSaveChangedData = false;
	var data = getInfoValue();
	api.editMachineInfo(machineId, data)
		 .done(function(data) {
				hasSaveChangedData = true;
				ifAllSavedThenGotoIndexPage();
		 })
		 .fail(function(err) { console.log("EDIT Machine Info error: ", err); });
}

function saveNewData() {
	hasSaveNewData = false;
	var data = getInfoValue();
	api.createMachine(data)
		 .done(function(data) {
				hasSaveNewData = true;
				ifAllSavedThenGotoIndexPage();
		 })
		 .fail(function(err) { console.log("CREATE Machine error: ", err); });
}

function saveNewRecord() {
	hasSaveNewRecord = false;
	var newRecords = getNewRecordList();
	if (newRecords && newRecords.length !== 0) {
		api.createMachineRecord(machineId, newRecords)
			 .done(function(data) {
					hasSaveNewRecord = true;
					ifAllSavedThenGotoIndexPage();
				})
			 .fail(function(err) { console.log("CREATE Machine Record error: ", err); });
	} else {
		hasSaveNewRecord = true;
		ifAllSavedThenGotoIndexPage();
	}
}

function saveDeleteRecord() {
	hasSaveDeleteRecord = false;
	var deleteRecords = getDeleteRecordList();
	if (deleteRecords && deleteRecords.length !== 0) {
		api.deleteMachineRecord(machineId, deleteRecords)
			 .done(function(data) {
					hasSaveDeleteRecord = true;
					ifAllSavedThenGotoIndexPage();
			 })
			 .fail(function(err) { console.log("CREATE Machine Record error: ", err); });
	} else {
		hasSaveDeleteRecord = true;
		ifAllSavedThenGotoIndexPage();
	}
}

function ifAllSavedThenGotoIndexPage() {
	if ( getAllSavedCondition() ) api.goToMachineIndex();
}

function getAllSavedCondition() {
	return isCreateMode ? getCreateModeCondition() : getEditModeCondition() ;
}

function getCreateModeCondition() {
	return hasSaveNewData && hasSaveNewRecord;
}

function getEditModeCondition() {
	return hasSaveChangedData && hasSaveNewRecord && hasSaveDeleteRecord;
}

function deleteMachine() {
	api.deleteMachine(machineId)
		 .done(function(data) {
				api.goToMachineIndex();
			})
		 .fail(function(err) { console.log("DELETE Machine error: ", err); });
}

function initialView(data) {
	originalData = data;
	initBaseInfo(data);
	initResumeInfo(data);
}

function resetViewData() {
	initBaseInfo(originalData);
	initResumeInfo(originalData);
}

function initBaseInfo(data) {
	$serialNumber.find('.view-mode').text(data['serial_num']);
	$serialNumber.find('.edit-mode').val(data['serial_num']);

	$name.find('.view-mode').text(data['name']);
	$name.find('.edit-mode').val(data['name']);

	$weight.find('.view-mode').text(data['weight']);
	$weight.find('.edit-mode').val(data['weight']);

	// TODO: 機台稼動率
}

function initResumeInfo(data) {
	noticedId = data['admin_id'];
	setNoticedId(noticedId);
	noticeedPersonDropdown.setNoticeedPerson(noticedId);
	checkPeriodDropdown   .init(data['check_period_value'], data['check_period_unit']);
	maintainPeriodDropdown.init(data['maintain_period_value'], data['maintain_period_unit']);

	checkRecordTable.initialView(data['maintain_record_check']);
	maintainRecordTable.initialView(data['maintain_record_maintain']);
	errorRecordTable.initialView(data['maintain_record_maintain']);
}

function initialNoticedName(data) {
	if (noticedId) {
		_.forEach(data, function(value, key) {
			if (key === noticedId) {
				setUserName(value.name);
				return;
			}
		});
	} else {
		userList = data;
	}
}

function setNoticedId(id) {
	_.forEach(userList, function(value, key) {
		if (key === id) {
			setUserName(value.name);
			return;
		}
	});
}

function setUserName(name) {
	$noticeedPersonName.text(name);
}

function getInfoValue() {
	var data = {};
	$editModeCollection.each(function(index, el) {
		var name  = $(el).attr('name');
		var value = $(el).val();

		if (name) {
			value = value ? value : '';
			data[name] = value;
		}
	});
	data['admin_id']  = noticeedPersonDropdown.getId();
	data['check_period_value']    = checkPeriodDropdown.getValue();
	data['check_period_unit']     = checkPeriodDropdown.getType();
	data['maintain_period_value'] = maintainPeriodDropdown.getValue();
	data['maintain_period_unit']  = maintainPeriodDropdown.getType();
	return data;
}

function getNewRecordList() {
	var check    = addMachineIdIntoData(checkRecordTable.getNewList());
	var maintain = addMachineIdIntoData(maintainRecordTable.getNewList());
	var error    = addMachineIdIntoData(errorRecordTable.getNewList());
	var data;
	if (check.length || maintain.length || error.length) {
		data = [].concat(check, maintain, error);
	}
	return data;
}

function getDeleteRecordList() {
	var check    = addMachineIdIntoData(checkRecordTable.getDeleteList());
	var maintain = addMachineIdIntoData(maintainRecordTable.getDeleteList());
	var error    = addMachineIdIntoData(errorRecordTable.getDeleteList());
	var data;
	if (check.length || maintain.length || error.length) {
		data = [].concat(check, maintain, error);
	}
	return data;
}

function addMachineIdIntoData(array) {
	return array.map(function(el, i) {
		el.machine_id = machineId;
		return el;
	});
}
