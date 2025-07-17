@@ .. @@
 const express = require('express');
-const Exam = require('../server/models/Exam');
+const Exam = require('../models/Exam.cjs');
 const { v4: uuidv4 } = require('uuid');