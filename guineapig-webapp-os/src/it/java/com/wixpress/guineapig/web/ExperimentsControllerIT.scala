package com.wixpress.guineapig.web

import java.util.{Arrays, List => JList}

import com.wixpress.guineapig.drivers.{JsonResponse, SpecificationWithEnvSupport}
import com.wixpress.guineapig.dsl.TestGroupMakers
import com.wixpress.guineapig.entities.ui.{UiExperiment, UiExperimentBuilder, UiTestGroup}
import org.joda.time.DateTime
import org.specs2.specification.Scope

class ExperimentsControllerIT extends SpecificationWithEnvSupport {

  trait Context extends Scope {

    val url = "http://localhost:9901/v1"

    def createExperiment(experimentId: Int, groups: JList[UiTestGroup] = TestGroupMakers.UI_TEST_GROUPS_FOR_CLIENT_WITH_NEW_WINNING): UiExperiment = {
        UiExperimentBuilder
          .anUiExperiment()
          .withid(experimentId)
          .withSpecKey(false)
          .withScope("publicUrl")
          .withGroups(groups)
          .withEndDate(new DateTime().plusYears(1).getMillis)
          .build()
    }

    def postExperiment(experimentId: Int): JsonResponse = {
      httpDriver.post(s"$url/Experiments", createExperiment(experimentId))
    }

    def checkExperimentContains(experimentId: Int, firstStr: String, secStr: String): Unit = {
      val experiment = httpDriver.get(s"$url/Experiment/$experimentId")
      experiment.getBodyRaw must contain (firstStr) and contain (secStr)
    }

  }

  // todo guineapig-os: test cases are copied from com.wixpress.guineapig.PetriWebappIT

  "Experiment controller" should {
    "create experiment without spec" in new Context {
      val id = 1
      val newExperimentResponse = postExperiment(id)
      newExperimentResponse.getSuccess must beTrue

      val getExperimentResponse = httpDriver.get(s"$url/Experiment/$id")
      getExperimentResponse.getSuccess must beTrue
    }

    "update an existing experiment" in new Context {
      val id = 2
      postExperiment(id)

      val uiExperiment = createExperiment(id, groups = Arrays.asList(new UiTestGroup(1, "yashan", 0), new UiTestGroup(2, "hadash", 100)))
      val resultUpdate = httpDriver.put(s"$url/Experiment/$id", uiExperiment)
      resultUpdate.getSuccess must beTrue

      checkExperimentContains(experimentId = id, "yashan", "hadash")
    }

    "terminate an existing experiment" in new Context {
      val id = 3
      postExperiment(id)

      val comment = "terminate reason"
      val terminateRes = httpDriver.postText(s"$url/Experiment/$id/terminate", comment)
      terminateRes.getSuccess must beTrue

      checkExperimentContains(experimentId = id, "\"state\":\"ended\"", s"""comment":"$comment""")
    }

    "pause an experiment" in new Context {
      val id = 4
      postExperiment(id)

      val comment = "pause reason"
      val pauseRes = httpDriver.postText(s"$url/Experiment/$id/pause", comment)
      pauseRes.getSuccess must beTrue

      checkExperimentContains(experimentId = id, "\"paused\":true", s"""comment":"$comment""")
    }

    "resume an experiment" in new Context {
      val id = 5
      postExperiment(id)
      httpDriver.post(s"$url/Experiment/$id/pause", "pause reason")

      val comment = "resume reason"
      val resumeRes = httpDriver.postText(s"$url/Experiment/$id/resume", comment)
      resumeRes.getSuccess must beTrue

      checkExperimentContains(experimentId = id, "\"paused\":false", s"""comment":"$comment""")
    }

    "expand an experiment" in pending

    "get an experiment reports" in pending

    "add spec exposureId" in pending

    "support experiment conduction limit" in pending

    "not suggest deletion when an experiment with no spec is terminated" in pending
  }
}
