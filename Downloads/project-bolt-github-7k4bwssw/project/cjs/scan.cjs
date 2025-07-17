@@ .. @@
 const express = require('express');
 const multer = require('multer');
-const Response = require('../server/models/Response');
+const Response = require('../models/Response.cjs');
 
 const router = express.Router();
@@ .. @@
     }
     
-    const Exam = require('../server/models/Exam');
+    const Exam = require('../models/Exam.cjs');
     const exam = await Exam.findOne({ examId });