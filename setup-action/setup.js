/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright IBM Corporation 2021
 */

import core from '@actions/core'
import github from '@actions/github'
import Registry from '../npm/Registry.js'
import InvalidArgumentException from '../common/InvalidArgumentException.js'
import * as utils from '../common/utils.js';

var publishRegistry
var installRegistry
var packageName
var nodeJsVersion
var debug = false
var projectRootPath = process.env.GITHUB_WORKSPACE + '/'

// Get packageName
packageName = core.getInput('packageName')     
if (!packageName) 
    throw new InvalidArgumentException('packageName')

// Get nodejs version
nodeJsVersion = core.getInput('nodeJsVersion')
if (!nodeJsVersion)
    throw new InvalidArgumentException('nodeJsVersion')

// Making publishRegistry
var prEmail = core.getInput('publishRegistry_email')
var prUsername = core.getInput('publishRegistry_username')
var prPassword = core.getInput('publishRegistry_password')
var prTokenCredential = core.getInput('publishRegistry_tokenCredential') //if username + password and token both provided, we will prioritize on token authentication
if (prEmail && ((prUsername && prPassword) || prTokenCredential)) {
    console.log('Init publish registry ...')
    var args = new Map()
    args.set('email', prEmail)
    args.set('username', prUsername)
    args.set('password', prPassword)
    args.set('tokenCredential', prTokenCredential)
    publishRegistry = new Registry(args)
    // try to extract publish registry from package.json
    publishRegistry.initFromPackageJson(args)
    console.log(`- ${publishRegistry.scope ? '@'+publishRegistry.scope+':':''}${publishRegistry.registry ? publishRegistry.registry:'(WARNING: undefined publish registry)'}`)
    console.log('Done init publish registry\n')
} else {
    if (!prEmail)
        throw new InvalidArgumentException('publishRegistry_email')
    if (!prTokenCredential) {
        if (prUsername || prPassword) {
            if (!prUsername)
                throw new InvalidArgumentException('publishRegistry_username')
            if (!prPassword)
                throw new InvalidArgumentException('publishRegistry_password')
        } else {
            throw new InvalidArgumentException('Either provide token for publish registry or username/password pair')
        }
    }
}

// Making installRegistry
var irEmail = core.getInput('installRegistry_email')
var irUsername = core.getInput('installRegistry_username')
var irPassword = core.getInput('installRegistry_password')
var irRegistry = core.getInput('installRegistry_registry') 
var irTokenCredential = core.getInput('installRegistry_tokenCredential') //if username + password and token both provided, we will prioritize on token authentication
if (irEmail && ((irUsername && irPassword) || irTokenCredential)) {
    console.log('Init install registry ...')
    var args = new Map()
    args.set('email', irEmail)
    args.set('username', irUsername)
    args.set('password', irPassword)
    args.set('tokenCredential', irTokenCredential)
    args.set('registry', irRegistry)
    installRegistry = new Registry(args)
    console.log(`- ${installRegistry.scope ? '@'+installRegistry.scope+':':''}`+ installRegistry.registry)
    console.log('Done init install registry\n')
    console.log('Login to install registry')
    installRegistry.login()
    console.log('Done Login to install registry\n')
} else {
    if (!irEmail)
        throw new InvalidArgumentException('installRegistry_email')
    if (!irTokenCredential) {
        if (irUsername || irPassword) {
            if (!irUsername)
                throw new InvalidArgumentException('installRegistry_username')
            if (!irPassword)
                throw new InvalidArgumentException('installRegistry_password')
        } else {
            throw new InvalidArgumentException('Either provide token for install registry or username/password pair')
        }
    }
}

// Init package info from package.json
var packageInfo = publishRegistry.getPackageInfo()
if (!packageInfo.get('versionTrunks') || packageInfo.get('versionTrunks').get('prerelease'))
    throw new Error('Version defined in package.json shouldn\'t have pre-release string or metadata, pipeline will adjust based on branch and build parameter.')
console.log('Package information: '+packageName+' v'+packageInfo.get('version'))

// init nvmShell
console.log('Pipeline will use node.js '+nodeJsVersion+' to build and test')
utils.nvmShellInit(nodeJsVersion)

// Install Node Package Dependencies
console.log('Install node package dependencies')
if (utils.fileExists(projectRootPath+'yarn.lock')) {
    utils.nvmShell('yarn install')
} else {
    // we save audit part to next stage
    var alwaysUseNpmInstall = core.getInput('alwaysUseNpmInstall')
    if (alwaysUseNpmInstall) {
        utils.nvmShell('npm install --no-audit')
    } else {
        if (utils.fileExists(projectRootPath+'package-lock.json')) {
            // if we have package-lock.json, try to use everything defined in that file
            utils.nvmShell('npm ci')
        } else {
            utils.nvmShell('npm install --no-audit')
        }
    }
}

        //process.env.'artifactory_url');
        //console.log(`Hello ${nameToGreet}!`);
        //core.setOutput("time", time);