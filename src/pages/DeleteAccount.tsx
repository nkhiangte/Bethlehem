/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export default function DeleteAccount() {
  return (
    <div className="max-w-4xl mx-auto p-6 md:p-8 bg-white dark:bg-gray-900 rounded-xl shadow-sm">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Account Deletion Request</h1>
      
      <div className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300">
        <p className="mb-4">
          If you wish to delete your account and all associated data from the Bethlehem Kohhran application, you can request account deletion using the contact information below.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">How to Request Account Deletion</h2>
        <p className="mb-4">
          Please send an email to our support team with the subject line "<strong>Account Deletion Request</strong>" from the email address associated with your account.
        </p>

        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg my-6">
          <p className="mb-2"><strong>Send request to:</strong> kohhranb@gmail.com</p>
          <p><strong>Required Information:</strong></p>
          <ul className="list-disc pl-6 mb-0 mt-2 space-y-1">
            <li>Your full name</li>
            <li>The email address associated with your account</li>
            <li>A brief statement requesting the deletion of your account and data</li>
          </ul>
        </div>

        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">What happens when your account is deleted?</h2>
        <ul className="list-disc pl-6 mb-6 space-y-2">
          <li>Your profile and login credentials will be permanently removed.</li>
          <li>Any personal data associated with your account will be deleted from our active databases.</li>
          <li>You will no longer be able to access features that require an account.</li>
        </ul>

        <p className="text-sm text-gray-500 mt-8">
          Please note that we may retain certain data as required by law or for legitimate business purposes (such as security logs or dispute resolution). Account deletion requests are typically processed within 7-14 business days.
        </p>
      </div>
    </div>
  );
}
