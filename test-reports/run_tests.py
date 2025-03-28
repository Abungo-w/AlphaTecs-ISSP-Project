import unittest
from technology_test import TechnologyTest
from business_test import BusinessTest
import sys

def run_all_tests():
    """Run all test suites and generate reports"""
    # Create test suites
    tech_suite = unittest.TestLoader().loadTestsFromTestCase(TechnologyTest)
    business_suite = unittest.TestLoader().loadTestsFromTestCase(BusinessTest)
    
    # Run tests
    print("=== Running Technology Tests ===")
    tech_result = unittest.TextTestRunner(verbosity=2).run(tech_suite)
    
    print("\n=== Running Business Tests ===")
    business_result = unittest.TextTestRunner(verbosity=2).run(business_suite)
    
    # Print summary
    print("\n=== Test Summary ===")
    print(f"Technology Tests: {tech_result.testsRun} run, {len(tech_result.errors)} errors, {len(tech_result.failures)} failures")
    print(f"Business Tests: {business_result.testsRun} run, {len(business_result.errors)} errors, {len(business_result.failures)} failures")
    
    # Return exit code based on test results
    return 0 if tech_result.wasSuccessful() and business_result.wasSuccessful() else 1

if __name__ == "__main__":
    sys.exit(run_all_tests())
