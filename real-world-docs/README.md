# Real-World Procurement Documents & Tender Corpus

This directory contains genuine procurement tenders, government RFPs, and control documents downloaded from the internet and ready for intake testing in **RFPground**:

---

### Available Real-World Tenders & RFPs:

1. **`WFP_Logistics_Supply_Chain_RFP.pdf`** (282.3 KB)
   - **Issuing Body**: United Nations World Food Programme (WFP)
   - **Type**: International Logistics & Supply Chain Procurement RFP
   - **Key Clauses**: Submission instructions, delivery timelines, vendor qualification, contractual liabilities.

2. **`City_of_Wichita_Enterprise_Services_RFP.pdf`** (213.9 KB)
   - **Issuing Body**: City of Wichita, Kansas (US Municipal Government)
   - **Type**: Enterprise Services & Procurement Request for Proposal
   - **Key Clauses**: General conditions, scope of services, proposal formatting, evaluation criteria.

3. **`Shelby_County_Government_RFP.pdf`** (200.5 KB)
   - **Issuing Body**: Shelby County Government, Tennessee
   - **Type**: Government Services & Public Procurement RFP
   - **Key Clauses**: Minimum eligibility qualifications, living wage requirements, E-Verify compliance, termination terms.

4. **`CDAC_CyberSecurity_RFP_Tender.pdf`** (36.6 KB)
   - **Issuing Body**: Centre for Development of Advanced Computing (C-DAC), Ministry of Electronics & IT (MeitY), Government of India
   - **Type**: Technical Equipment & Cyber Services Tender Notice
   - **Key Clauses**: Bid Security / EMD rules, commercial terms, submission deadline.

5. **`scam_anoynomous_[Real_Tender].pdf`** (565.3 KB, 33 Pages)
   - **Issuing Body**: Ministry of Food Processing Industries (MoFPI), Government of India
   - **Type**: Event Partner for World Food India 2019 RFP
   - **Key Clauses**: 77 extracted clauses, INR 50 Cr turnover pre-qualification, 150 manpower gate, EMD/PBG, liquidated damages (0.5%/week), and unilateral default termination.

---

### Non-Tender Control Specimens:

6. **`QuizArena Competition Economics v1_[Real_Tender].pdf`** (3.9 MB)
   - Internal business policy manual (Verifies `AI_REJECTED` qualification state).
7. **`Business Analyst - Aiotrix_[Real_Tender].pdf`** (207.9 KB)
   - Job specification (Verifies sparse extraction and missing information discovery).
8. **`Software-as-a-ServiceRevenueModels _[Real_Tender].pdf`** (793.4 KB)

---

### How to Test in RFPground:

1. Open **[http://localhost:3000](http://localhost:3000)** in your browser.
2. Click **`+ New Tender`** in the top navigation bar.
3. Drag & drop any PDF from this `real-world-docs/` folder into the upload zone.
4. RFPground will process the file, extract clauses, verify quotations, and display the **Decision Brief**, **Attention Lanes**, and **Evidence Inspector**.
