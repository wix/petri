package com.wixpress.common.petri

import java.util.Arrays._

import com.gargoylesoftware.htmlunit.BrowserVersion
import com.github.tomakehurst.wiremock.client.VerificationException
import com.wixpress.petri.experiments.domain.TestGroup
import com.wixpress.petri.fakeserver.FakePetriServer
import com.wixpress.petri.laboratory.{BiPetriEvent, BiServerDriver}
import com.wixpress.petri.test.{SampleAppRunner, TestBuilders}
import org.openqa.selenium.htmlunit.HtmlUnitDriver
import org.openqa.selenium.{By, WebElement}
import org.specs2.mutable.SpecificationWithJUnit
import org.specs2.specification.BeforeAfterAll

class GoogleAnalyticsTestappIT extends SpecificationWithJUnit with BeforeAfterAll {
  val webappPath = classOf[GoogleAnalyticsTestappIT].getResource("/").getPath + "../../../petri-bi-integration-testapp/src/main/webapp"
  val webappPort = 9811
  val googleAnalyticsPort = 11981
  var petriServerPort = 9010
  val googleAnalyticsDriver = new BiServerDriver(googleAnalyticsPort, "collect")
  val appRunner = new SampleAppRunner(webappPort, webappPath, 1, true, googleAnalyticsDriver.biServerUrl)
  val sampleAppViewDriver = new SampleAppViewDriver(webappPort)
  val petriDriver = new PetriDriver()

  "GoogleAnalyticsTestapp" should {
    "enter the page, click the button and check that petri event + business bi event were logged in google analytics" in {
      petriDriver.addSpecAndExperiment("BUTTON_COLOR_SPEC")

      sampleAppViewDriver.enterThePageAndClickButton()

      eventually {
        googleAnalyticsDriver.assertThatBiServerWasCalledWith(partialBody = ButtonClickedEvent.eventType) must not(throwA[VerificationException])
        googleAnalyticsDriver.assertThatBiServerWasCalledWith(partialBody = BiPetriEvent.petriBiEventType) must not(throwA[VerificationException])
      }
    }
  }

  override def beforeAll(): Unit = {
    petriDriver.start()
    googleAnalyticsDriver.start()
    appRunner.start()
  }

  override def afterAll(): Unit = {
    googleAnalyticsDriver.stop()
    petriDriver.stop()
    appRunner.stop()
  }

  class SampleAppViewDriver(port: Int) {
    private val driver = new HtmlUnitDriver(BrowserVersion.CHROME, true)
    private val pageUrl = s"http://localhost:$port/testGoogleAnalytics"

    def enterThePageAndClickButton() = {
      driver.get(pageUrl)
      val button = driver.findElement(By.id("buttonId"))
      assertButtonWasNotRenderedOnFallbackColor(button)

      button.click()

      driver.findElement(By.id("resultText")).getText must eventually(contain("Finished"))
    }
  }

  def assertButtonWasNotRenderedOnFallbackColor(button: WebElement) = {
    button.getAttribute("style") must contain("color: red")
  }

  class PetriDriver() {
    private val petri = new FakePetriServer(petriServerPort, webappPort)

    def start() = petri.start()

    def stop() = petri.stop()

    def addSpecAndExperiment(key: String) = {
      petri.addSpec(TestBuilders.abSpecBuilder(key))

      petri.addExperiment(TestBuilders.experimentWithFirstWinning(key).
        withGroups(asList(new TestGroup(1, 100, "red"), new TestGroup(2, 0, "blue"))))
    }
  }
}